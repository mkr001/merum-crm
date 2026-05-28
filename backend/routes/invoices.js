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
  const { status, client_id, startDate, endDate, page = 1, limit = 50 } = req.query;
  let q = supabase.from('invoices').select('*, clients(org_name), invoice_items(*)', { count: 'exact' });
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
  res.json(data);
}));

router.post('/bulk', authorize('admin', 'manager', 'accountant'), asyncHandler(async (req, res) => {
  try {
    const { invoices } = req.body;
    if (!Array.isArray(invoices)) return res.status(400).json({ error: 'Invalid payload' });

    let successCount = 0;
    const failedRecords = [];

    // Pre-fetch all clients to optimize client lookup
    const { data: clientsData } = await supabase.from('clients').select('id, org_name');
    const clientsMap = new Map();
    (clientsData || []).forEach(c => clientsMap.set(c.org_name.toLowerCase().trim(), c.id));

    // Pre-fetch services to map by name
    const { data: servicesData } = await supabase.from('services').select('id, name');
    const servicesMap = new Map();
    (servicesData || []).forEach(s => servicesMap.set(s.name.toLowerCase().trim(), s.id));

    // Pre-fetch existing invoices to check duplicates
    const invoiceNumbers = invoices.map(i => i.invoice_number).filter(Boolean);
    let existingInvoiceNumbers = new Set();
    if (invoiceNumbers.length > 0) {
      const { data: existingInvs } = await supabase.from('invoices').select('invoice_number').in('invoice_number', invoiceNumbers);
      existingInvoiceNumbers = new Set((existingInvs || []).map(i => i.invoice_number));
    }

    for (let i = 0; i < invoices.length; i++) {
      const row = invoices[i];
      try {
        if (!row.company_name) throw new Error('Company Name is required');

        let inv_number = row.invoice_number || undefined;
        if (inv_number && existingInvoiceNumbers.has(inv_number)) {
          throw new Error(`Duplicate invoice number: ${inv_number}`);
        }

        let clientId = clientsMap.get(row.company_name.toLowerCase().trim());
        if (!clientId) {
          const { data: newClient, error: clientErr } = await supabase.from('clients')
            .insert([{ org_name: row.company_name.trim() }])
            .select().single();
          if (clientErr) throw new Error(`Could not create client: ${clientErr.message}`);
          clientId = newClient.id;
          clientsMap.set(newClient.org_name.toLowerCase().trim(), clientId);
        }

        const taxRate = Number(row.tax_rate) || 18;
        const subtotal = Number(row.amount) || 0;
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount;

        let isoIssueDate = null;
        if (row.invoice_date) {
          const parsedIssue = new Date(row.invoice_date);
          if (!isNaN(parsedIssue)) isoIssueDate = parsedIssue.toISOString().split('T')[0];
        }

        let isoDueDate = null;
        if (row.due_date) {
          const parsedDue = new Date(row.due_date);
          if (!isNaN(parsedDue)) isoDueDate = parsedDue.toISOString().split('T')[0];
        }

        const invoicePayload = {
          client_id: clientId,
          issue_date: isoIssueDate || new Date().toISOString().split('T')[0],
          due_date: isoDueDate || null,
          status: 'draft',
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: row.total_amount || totalAmount,
          generated_by: req.user.id
        };
        if (inv_number) invoicePayload.invoice_number = inv_number;

        const { data: inv, error: invErr } = await supabase.from('invoices').insert([invoicePayload]).select().single();

        if (invErr) throw new Error(`Invoice insert failed: ${invErr.message}`);

        if (inv_number) {
          existingInvoiceNumbers.add(inv_number);
        }

        let serviceId = null;
        if (row.service_name) {
          serviceId = servicesMap.get(row.service_name.toLowerCase().trim()) || null;
        }

        const { error: itemErr } = await supabase.from('invoice_items').insert([{
          invoice_id: inv.id,
          service_id: serviceId,
          description: row.description || row.service_name || 'Bulk Invoice Item',
          quantity: Number(row.quantity) || 1,
          unit_price: Number(row.amount) || 0,
          line_total: subtotal
        }]);

        if (itemErr) throw new Error(`Item insert failed: ${itemErr.message}`);

        successCount++;
      } catch (err) {
        failedRecords.push({ rowNumber: i + 2, data: row, error: err.message });
      }
    }

    res.json({ successCount, failedRecords });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

router.post('/', authorize('admin', 'manager', 'accountant'), validate(invoiceCreateSchema), asyncHandler(async (req, res) => {
  const { items = [], ...invoice } = req.validatedBody;
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const tax_amount = subtotal * (invoice.tax_rate || 18) / 100;
  const total_amount = subtotal + tax_amount;

  const { data: inv, error } = await supabase.from('invoices').insert([{
    ...invoice, subtotal, tax_amount, total_amount,
    generated_by: req.user.id
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

module.exports = router;

