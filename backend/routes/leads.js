// routes/leads.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const { initializeOnboarding } = require('../utils/onboarding');
const asyncHandler = require('../utils/asyncHandler');
const { validate, leadCreateSchema, leadUpdateSchema } = require('../utils/validators');
const router = express.Router();

router.use(authenticate);

// GET /api/leads — list with filters
router.get('/', asyncHandler(async (req, res) => {
  const { status, assigned_to, source, page = 1, limit = 20 } = req.query;
  let query = supabase.from('leads').select('*, users!leads_assigned_to_fkey(full_name, email)', { count: 'exact' });

  if (status)      query = query.eq('status', status);
  if (assigned_to) query = query.eq('assigned_to', assigned_to);
  if (source)      query = query.eq('source', source);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count, page: +page, limit: +limit });
}));

// GET /api/leads/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('leads').select('*, users!leads_assigned_to_fkey(full_name, email)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Lead not found' });
  res.json(data);
}));

// POST /api/leads
router.post('/', authorize('admin', 'manager', 'sales'), validate(leadCreateSchema), asyncHandler(async (req, res) => {
  const validated = req.validatedBody;

  const { data, error } = await supabase.from('leads').insert([{
    org_name: validated.org_name,
    contact_person: validated.contact_person,
    email: validated.email,
    phone: validated.phone,
    org_type: validated.org_type,
    source: validated.source,
    status: validated.status || 'new',
    interest_services: validated.interest_services,
    notes: validated.notes,
    assigned_to: validated.assigned_to,
    expected_value: validated.expected_value,
    expected_close: validated.expected_close
  }]).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Log activity
  await supabase.from('activity_log').insert([{
    performed_by: req.user.id, entity_type: 'lead',
    entity_id: data.id, action: 'created', new_value: data
  }]);

  res.status(201).json(data);
}));

// PATCH /api/leads/:id
router.patch('/:id', authorize('admin', 'manager', 'sales'), validate(leadUpdateSchema), asyncHandler(async (req, res) => {
  const updates = { ...req.validatedBody, updated_at: new Date() };
  const { data, error } = await supabase.from('leads').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('activity_log').insert([{
    performed_by: req.user.id, entity_type: 'lead',
    entity_id: req.params.id, action: 'updated', new_value: updates
  }]);

  res.json(data);
}));

// PATCH /api/leads/:id/convert — Convert lead to client
router.patch('/:id/convert', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { data: lead } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { data: client, error } = await supabase.from('clients').insert([{
    lead_id: lead.id,
    org_name: lead.org_name,
    org_type: lead.org_type,
    account_manager_id: lead.assigned_to
  }]).select().single();

  if (error) return res.status(500).json({ error: error.message });

  try {
    await initializeOnboarding(client.id, req.user.id, lead.interest_services);
  } catch (onboardingErr) {
    await supabase.from('clients').delete().eq('id', client.id);
    return res.status(500).json({ error: `Onboarding setup failed: ${onboardingErr.message}` });
  }

  await supabase.from('leads').update({ status: 'converted' }).eq('id', req.params.id);

  res.json({ message: 'Lead converted to client', client });
}));

// DELETE /api/leads/:id
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Lead deleted' });
}));

module.exports = router;

