// routes/contracts.js — Contract / Proposal Management
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate, contractCreateSchema, contractUpdateSchema } = require('../utils/validators');
const router = express.Router();
router.use(authenticate);

// List contracts
router.get('/', asyncHandler(async (req, res) => {
  const { status, client_id, contract_type, page = 1, limit = 50 } = req.query;
  let q = supabase.from('contracts')
    .select('*, clients(org_name), creator:users!contracts_created_by_fkey(full_name)', { count: 'exact' });
  if (status) q = q.eq('status', status);
  if (client_id) q = q.eq('client_id', client_id);
  if (contract_type) q = q.eq('contract_type', contract_type);
  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1).order('created_at', { ascending: false });
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count });
}));

// Get single
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('contracts')
    .select('*, clients(org_name), creator:users!contracts_created_by_fkey(full_name)')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
}));

// Create
router.post('/', authorize('admin', 'manager'), validate(contractCreateSchema), asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('contracts')
    .insert([{ ...req.validatedBody, created_by: req.user.id }])
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}));

// Update
router.patch('/:id', authorize('admin', 'manager'), validate(contractUpdateSchema), asyncHandler(async (req, res) => {
  const updates = { ...req.validatedBody, updated_at: new Date() };
  if (req.validatedBody.status === 'signed' && !req.validatedBody.signed_at) {
    updates.signed_at = new Date();
  }
  const { data, error } = await supabase.from('contracts')
    .update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}));

// Delete
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  await supabase.from('contracts').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;

