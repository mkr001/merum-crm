// routes/contracts.js — Contract / Proposal Management
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

// List contracts
router.get('/', async (req, res) => {
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
});

// Get single
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('contracts')
    .select('*, clients(org_name), creator:users!contracts_created_by_fkey(full_name)')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// Create
router.post('/', authorize('admin', 'manager'), async (req, res) => {
  const { data, error } = await supabase.from('contracts')
    .insert([{ ...req.body, created_by: req.user.id }])
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update
router.patch('/:id', authorize('admin', 'manager'), async (req, res) => {
  const updates = { ...req.body, updated_at: new Date() };
  if (req.body.status === 'signed' && !req.body.signed_at) {
    updates.signed_at = new Date();
  }
  const { data, error } = await supabase.from('contracts')
    .update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete
router.delete('/:id', authorize('admin'), async (req, res) => {
  await supabase.from('contracts').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
