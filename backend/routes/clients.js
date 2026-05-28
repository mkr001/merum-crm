// routes/clients.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const { initializeOnboarding } = require('../utils/onboarding');
const asyncHandler = require('../utils/asyncHandler');
const { validate, clientCreateSchema, clientUpdateSchema } = require('../utils/validators');
const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  // 1. Fetch clients with account manager name
  let q = supabase.from('clients').select(`
    *,
    users!clients_account_manager_id_fkey(full_name)
  `, { count: 'exact' });

  if (status) {
    q = q.eq('status', status);
  } else {
    q = q.neq('status', 'deleted');
  }

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1).order('org_name');
  
  const { data: clients, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data: clients || [], total: count || 0, page: +page, limit: +limit });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('clients')
    .select('*, users!clients_account_manager_id_fkey(full_name, email), contacts(*), client_services(*, services(*), users!client_services_assigned_team_member_fkey(full_name))')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Client not found' });
  res.json(data);
}));

// Bulk-insert clients from Excel/CSV upload (admin/manager only)
router.post('/bulk', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { clients } = req.body; // array of client objects
  if (!Array.isArray(clients) || clients.length === 0)
    return res.status(400).json({ error: 'Send a non-empty "clients" array.' });
  if (clients.length > 500)
    return res.status(400).json({ error: 'Maximum 500 clients per bulk upload.' });

  // Validate required field
  const results = { inserted: [], skipped: [] };
  const validRows = [];
  clients.forEach((row, idx) => {
    if (!row.org_name || !String(row.org_name).trim()) {
      results.skipped.push({ row: idx + 1, reason: 'Missing org_name' });
    } else {
      validRows.push({
        org_name:            String(row.org_name).trim(),
        org_type:            row.org_type || null,
        registration_number: row.registration_number || null,
        pan_number:          row.pan_number || null,
        gstin:               row.gstin || null,
        address:             row.address || null,
        city:                row.city || null,
        state:               row.state || null,
        pincode:             row.pincode ? String(row.pincode) : null,
        country:             row.country || 'India',
        website:             row.website || null,
        status:              ['active','inactive','churned'].includes(row.status) ? row.status : 'active',
      });
    }
  });

  if (validRows.length > 0) {
    const { data, error } = await supabase.from('clients').insert(validRows).select('id, org_name');
    if (error) return res.status(500).json({ error: error.message });
    results.inserted = data;

    // Log bulk activity
    await supabase.from('activity_log').insert([{
      performed_by: req.user.id,
      entity_type: 'client',
      entity_id: null,
      action: 'bulk_created',
      notes: `Bulk upload: ${data.length} clients created by admin`
    }]);
  }

  res.status(201).json({
    total: clients.length,
    inserted: results.inserted.length,
    skipped: results.skipped.length,
    skipped_details: results.skipped,
    data: results.inserted,
  });
}));

router.post('/', authorize('admin', 'manager'), validate(clientCreateSchema), asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('clients').insert([req.validatedBody]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  
  // Initialize onboarding tasks
  await initializeOnboarding(data.id, req.user.id, []);

  await supabase.from('activity_log').insert([{ performed_by: req.user.id, entity_type: 'client', entity_id: data.id, action: 'created' }]);
  res.status(201).json(data);
}));

router.patch('/:id', authorize('admin', 'manager', 'accountant'), validate(clientUpdateSchema), asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('clients').update({ ...req.validatedBody, updated_at: new Date() }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}));

// Offboard a client (admin/manager only)
// Sets status to 'churned' and cancels all active services
router.post('/:id/offboard', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  // 1. Fetch client to ensure existence and log its name
  const { data: client, error: fetchErr } = await supabase.from('clients')
    .select('org_name, status')
    .eq('id', id)
    .single();

  if (fetchErr || !client) return res.status(404).json({ error: 'Client not found' });
  if (client.status === 'deleted') return res.status(400).json({ error: 'Cannot offboard a deleted client. Restore it first.' });

  // 2. Update client status to 'churned'
  const { error: clientUpdateErr } = await supabase.from('clients')
    .update({ status: 'churned', updated_at: new Date() })
    .eq('id', id);

  if (clientUpdateErr) return res.status(500).json({ error: clientUpdateErr.message });

  // 3. Cancel all active services for this client
  const { error: servicesErr } = await supabase.from('client_services')
    .update({ 
      status: 'cancelled', 
      end_date: new Date(), 
      updated_at: new Date(),
      notes: reason ? `Offboarded: ${reason}` : 'Offboarded via system action'
    })
    .eq('client_id', id)
    .eq('status', 'active');

  // 4. Log the activity
  await supabase.from('activity_log').insert([{
    performed_by: req.user.id,
    entity_type: 'client',
    entity_id: id,
    action: 'offboarded',
    old_value: { status: client.status },
    new_value: { status: 'churned' },
    notes: `Client "${client.org_name}" offboarded (churned). Reason: ${reason || 'Not specified'}`
  }]);

  res.json({ message: `Client "${client.org_name}" has been offboarded.` });
}));

// Soft-delete a client (admin only)
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const { data: existing, error: fetchErr } = await supabase.from('clients').select('id, org_name, status').eq('id', req.params.id).single();
  if (fetchErr || !existing) return res.status(404).json({ error: 'Client not found' });
  if (existing.status === 'deleted') return res.status(400).json({ error: 'Client is already deleted' });

  const { data, error } = await supabase.from('clients')
    .update({ status: 'deleted', updated_at: new Date() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('activity_log').insert([{
    performed_by: req.user.id,
    entity_type: 'client',
    entity_id: req.params.id,
    action: 'deleted',
    old_value: { status: existing.status },
    new_value: { status: 'deleted' },
    notes: `Client "${existing.org_name}" soft-deleted by admin`
  }]);

  res.json({ message: 'Client deleted successfully', data });
}));

module.exports = router;

