// routes/invoices.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate, invoiceCreateSchema } = require('../utils/validators');
const router = express.Router();
router.use(authenticate);

// JS invoice number generation removed; handled by PostgreSQL default sequence.

router.get('/', asyncHandler(async (req, res) => {
  let { status, client_id, startDate, endDate, page = 1, limit = 50 } = req.query;

  // Client users can only see their own invoices
  if (req.user.roles?.name === 'client') {
    if (!req.user.client_id) return res.json({ data: [], total: 0 });
    client_id = req.user.client_id;
  }

  let q = supabase.from('invoices').select('*, clients(org_name, is_offboard), invoice_items(*)', { count: 'exact' });
  if (status) q = q.eq('status', status);
  if (client_id) q = q.eq('client_id', client_id);
  
  if (startDate) q = q.gte('issue_date', startDate);
  if (endDate) q = q.lte('issue_date', endDate);

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1).order('created_at', { ascending: false });
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('invoices')
    .select('*, clients(*), invoice_items(*, services(name))').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  // Client can only view their own invoices
  if (req.user.roles?.name === 'client' && data.client_id !== req.user.client_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(data);
}));

router.post('/bulk', authorize('admin', 'manager', 'accountant'), asyncHandler(async (req, res) => {
  const { invoices } = req.body;
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(400).json({ error: 'Invalid payload — invoices array required' });
  }

  // ── Step 1: Parallel pre-fetch (3 calls in one round-trip) ──────
  const invoiceNumbers = invoices.map(i => i.invoice_number).filter(Boolean);
  const [clientsResult, servicesResult, existingInvResult] = await Promise.all([
    supabase.from('clients').select('id, org_name'),
    supabase.from('services').select('id, name'),
    invoiceNumbers.length > 0
      ? supabase.from('invoices').select('invoice_number').in('invoice_number', invoiceNumbers)
      : Promise.resolve({ data: [] }),
  ]);

  const clientsMap = new Map();
  (clientsResult.data || []).forEach(c => clientsMap.set(c.org_name.toLowerCase().trim(), c.id));
  // Track which clients existed before this upload so we can update their details
  const preExistingKeys = new Set(clientsMap.keys());
  const servicesMap = new Map();
  (servicesResult.data || []).forEach(s => servicesMap.set(s.name.toLowerCase().trim(), s.id));
  const existingInvoiceNumbers = new Set((existingInvResult.data || []).map(i => i.invoice_number));

  // ── Step 2: Batch-create any unknown clients in ONE call ─────────
  // Build a map of name → full details so each new client gets its GST/address
  const unknownClientsMap = new Map();
  invoices.forEach(inv => {
    const name = inv.company_name?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!clientsMap.has(key) && !unknownClientsMap.has(key)) {
      unknownClientsMap.set(key, {
        org_name: name,
        is_offboard: true,
        gstin: inv.gstin || null,
        address: inv.address || null,
        city: inv.city || null,
        state: inv.state || null,
        pincode: inv.pincode || null,
      });
    }
  });
  if (unknownClientsMap.size > 0) {
    const { data: newClients } = await supabase
      .from('clients')
      .insert([...unknownClientsMap.values()])
      .select('id, org_name');
    (newClients || []).forEach(c => clientsMap.set(c.org_name.toLowerCase().trim(), c.id));
  }

  // ── Step 2b: Update pre-existing clients with any new GST/address data ──
  // If a client already existed but the upload now provides address/GSTIN, apply them.
  const seenUpdateKeys = new Set();
  const existingClientUpdates = [];
  invoices.forEach(inv => {
    const name = inv.company_name?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seenUpdateKeys.has(key) || !preExistingKeys.has(key)) return;
    seenUpdateKeys.add(key);
    const updates = {};
    if (inv.gstin)   updates.gstin   = inv.gstin;
    if (inv.address) updates.address = inv.address;
    if (inv.city)    updates.city    = inv.city;
    if (inv.state)   updates.state   = inv.state;
    if (inv.pincode) updates.pincode = inv.pincode;
    if (Object.keys(updates).length > 0) {
      existingClientUpdates.push({ id: clientsMap.get(key), updates });
    }
  });
  if (existingClientUpdates.length > 0) {
    await Promise.all(existingClientUpdates.map(({ id, updates }) =>
      supabase.from('clients').update(updates).eq('id', id)
    ));
  }

  // ── Step 3: Pre-fetch last invoice sequence for auto-numbering ──
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const invPrefix = `MRM-${yyyymm}-`;
  const { data: latestInv } = await supabase
    .from('invoices').select('invoice_number')
    .like('invoice_number', `${invPrefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  let lastSeq = latestInv?.[0]?.invoice_number
    ? parseInt(latestInv[0].invoice_number.replace(invPrefix, ''), 10)
    : 0;

  // ── Step 4: Validate & build payloads (pure CPU — no DB) ─────────
  const allowedStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
  const failedRecords = [];
  const validBatch = []; // { payload, items }

  const parseDate = (d) => {
    if (!d) return null;
    const p = new Date(d);
    return isNaN(p) ? null : p.toISOString().split('T')[0];
  };

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    try {
      if (!inv.company_name) throw new Error('Company Name is required');
      const items = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [];
      if (items.length === 0) throw new Error('At least one invoice item is required');

      // Use provided invoice number or auto-generate one
      let inv_number = inv.invoice_number || null;
      if (inv_number) {
        if (existingInvoiceNumbers.has(inv_number)) {
          throw new Error(`Duplicate invoice number: ${inv_number}`);
        }
      } else {
        inv_number = `${invPrefix}${String(++lastSeq).padStart(4, '0')}`;
      }
      existingInvoiceNumbers.add(inv_number);

      const clientId = clientsMap.get(inv.company_name.toLowerCase().trim());
      if (!clientId) throw new Error(`Could not find or create client: ${inv.company_name}`);

      const taxRate = Number(inv.tax_rate) || 18;
      const subtotal  = items.reduce((s, it) => s + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0), 0);
      const taxAmount = (subtotal * taxRate) / 100;

      const payload = {
        invoice_number: inv_number,
        client_id:    clientId,
        issue_date:   parseDate(inv.invoice_date) || new Date().toISOString().split('T')[0],
        due_date:     parseDate(inv.due_date),
        status:       allowedStatuses.includes(inv.status) ? inv.status : 'draft',
        subtotal,
        tax_rate:     taxRate,
        tax_amount:   taxAmount,
        total_amount: subtotal + taxAmount,
        notes:        inv.notes || null,
        generated_by: req.user.id,
      };

      validBatch.push({ payload, items });
    } catch (err) {
      failedRecords.push({ invoice: i + 1, company: inv.company_name, error: err.message });
    }
  }

  if (validBatch.length === 0) {
    return res.json({ successCount: 0, failedRecords });
  }

  // ── Step 4: Batch insert ALL invoices in ONE call ────────────────
  const { data: createdInvoices, error: invErr } = await supabase
    .from('invoices')
    .insert(validBatch.map(v => v.payload))
    .select('id');

  if (invErr) {
    return res.status(500).json({ error: `Batch invoice insert failed: ${invErr.message}` });
  }

  // ── Step 5: Batch insert ALL line items in ONE call ──────────────
  const allLineItems = createdInvoices.flatMap((createdInv, idx) =>
    validBatch[idx].items.map(it => {
      const qty   = Number(it.quantity)   || 1;
      const price = Number(it.unit_price) || 0;
      return {
        invoice_id:  createdInv.id,
        service_id:  servicesMap.get((it.service_name || '').toLowerCase().trim()) || null,
        description: it.description || it.service_name || 'Item',
        quantity:    qty,
        unit_price:  price,
        line_total:  qty * price,
      };
    })
  );

  if (allLineItems.length > 0) {
    const { error: itemErr } = await supabase.from('invoice_items').insert(allLineItems);
    if (itemErr) console.error('Line items batch insert error:', itemErr.message);
  }

  res.json({ successCount: createdInvoices.length, failedRecords });
}));

router.post('/', authorize('admin', 'manager', 'accountant'), validate(invoiceCreateSchema), asyncHandler(async (req, res) => {
  const { items = [], invoice_number: _ignored, new_client_name, new_client_gstin, new_client_address, new_client_city, new_client_state, new_client_pincode, ...invoice } = req.validatedBody;

  // If no existing client_id, create an offboard client on the fly
  if (!invoice.client_id && new_client_name) {
    const { data: newClient, error: clientErr } = await supabase.from('clients')
      .insert([{
        org_name: new_client_name.trim(),
        is_offboard: true,
        gstin: new_client_gstin || null,
        address: new_client_address || null,
        city: new_client_city || null,
        state: new_client_state || null,
        pincode: new_client_pincode || null,
      }])
      .select().single();
    if (clientErr) return res.status(500).json({ error: `Could not create client: ${clientErr.message}` });
    invoice.client_id = newClient.id;
  }

  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const tax_amount = subtotal * (invoice.tax_rate || 18) / 100;
  const total_amount = subtotal + tax_amount;

  // Generate invoice number: find highest existing sequence for this month, then increment
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `MRM-${yyyymm}-`;
  const { data: latestInv } = await supabase
    .from('invoices').select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  const lastSeq = latestInv?.[0]?.invoice_number
    ? parseInt(latestInv[0].invoice_number.replace(prefix, ''), 10)
    : 0;
  const invoice_number = `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;

  const { data: inv, error } = await supabase.from('invoices').insert([{
    ...invoice, subtotal, tax_amount, total_amount,
    generated_by: req.user.id,
    invoice_number
  }]).select().single();

  if (error) return res.status(500).json({ error: error.message });

  if (items.length > 0) {
    const lineItems = items.map(i => ({
      invoice_id: inv.id,
      service_id: i.service_id,
      description: i.description,
      quantity: i.quantity || 1,
      unit_price: i.unit_price,
      line_total: i.quantity * i.unit_price
    }));
    const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);
    if (itemsError) return res.status(500).json({ error: `Invoice created but items failed: ${itemsError.message}` });
  }

  res.status(201).json(inv);
}));

router.patch('/:id', authorize('admin', 'manager', 'accountant'), asyncHandler(async (req, res) => {
  const allowedFields = ['status', 'issue_date', 'due_date', 'tax_rate', 'payment_method', 'payment_reference', 'notes'];
  const updates = {};

  for (const field of allowedFields) {
    if (field in req.body) {
      updates[field] = req.body[field];
    }
  }

  updates.updated_at = new Date();

  const { data, error } = await supabase.from('invoices')
    .update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}));

// DELETE /api/invoices/:id (admin, manager, accountant only)
router.delete('/:id', authorize('admin', 'manager', 'accountant'), asyncHandler(async (req, res) => {
  // Supabase table rules handles cascade deletion of invoice_items due to foreign keys, 
  // but we can manually clean invoice_items first to be safe.
  await supabase.from('invoice_items').delete().eq('invoice_id', req.params.id);
  
  const { data, error } = await supabase.from('invoices')
    .delete()
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Invoice deleted successfully', data });
}));

router.post('/delete-batch', authorize('admin', 'manager', 'accountant'), asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Invalid IDs' });

  // Delete associated items first
  await supabase.from('invoice_items').delete().in('invoice_id', ids);
  
  const { data, error } = await supabase.from('invoices')
    .delete()
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Invoices deleted successfully', count: ids.length });
}));

router.post('/bulk-update', authorize('admin', 'manager', 'accountant'), asyncHandler(async (req, res) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Invalid IDs' });

  const payload = { ...updates, updated_at: new Date() };

  const { error } = await supabase.from('invoices').update(payload).in('id', ids);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Invoices updated successfully' });
}));

module.exports = router;

