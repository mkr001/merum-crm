// routes/tickets.js — Support Ticket System
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate, ticketCreateSchema, ticketUpdateSchema } = require('../utils/validators');
const router = express.Router();
router.use(authenticate);

// List tickets
router.get('/', asyncHandler(async (req, res) => {
  const { status, client_id, priority, assigned_to, page = 1, limit = 50 } = req.query;
  let q = supabase.from('support_tickets')
    .select('*, clients(org_name), raised:users!support_tickets_raised_by_fkey(full_name), assignee:users!support_tickets_assigned_to_fkey(full_name)', { count: 'exact' });
  if (status) q = q.eq('status', status);
  if (client_id) q = q.eq('client_id', client_id);
  if (priority) q = q.eq('priority', priority);
  if (assigned_to) q = q.eq('assigned_to', assigned_to);
  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1).order('created_at', { ascending: false });
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count });
}));

// Get single ticket
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('support_tickets')
    .select('*, clients(org_name), raised:users!support_tickets_raised_by_fkey(full_name), assignee:users!support_tickets_assigned_to_fkey(full_name)')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
}));

// Create ticket
router.post('/', validate(ticketCreateSchema), asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('support_tickets')
    .insert([{ ...req.validatedBody, raised_by: req.user.id }])
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}));

// Update ticket
router.patch('/:id', validate(ticketUpdateSchema), asyncHandler(async (req, res) => {
  const updates = { ...req.validatedBody, updated_at: new Date() };
  if (req.validatedBody.status === 'resolved' && !req.validatedBody.resolved_at) {
    updates.resolved_at = new Date();
  }
  const { data, error } = await supabase.from('support_tickets')
    .update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}));

// Delete ticket
router.delete('/:id', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  await supabase.from('support_tickets').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;

