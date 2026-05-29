// routes/compliance.js
const express = require('express');
const Joi = require('joi');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

const complianceSchema = Joi.object({
  client_id: Joi.string().uuid().required(),
  client_service_id: Joi.string().uuid().allow('', null),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  due_date: Joi.date().required(),
  completed_date: Joi.date().allow('', null),
  status: Joi.string().max(30).allow('', null),
  priority: Joi.string().max(20).allow('', null),
  assigned_to: Joi.string().uuid().allow('', null),
  reminder_days: Joi.number().integer().allow(null),
  category: Joi.string().max(80).allow('', null)
});

const complianceUpdateSchema = complianceSchema.fork(['client_id', 'title', 'due_date'], (schema) => schema.optional());

const validateCompliance = (req, res, next) => {
  const schema = req.method === 'PATCH' ? complianceUpdateSchema : complianceSchema;
  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details[0].message });
  req.body = value;
  next();
};

router.get('/', async (req, res) => {
  let { status, client_id, priority, page = 1, limit = 50 } = req.query;

  // Client users can only see their own compliance items
  if (req.user.roles?.name === 'client') {
    if (!req.user.client_id) return res.json({ data: [], total: 0 });
    client_id = req.user.client_id;
  }

  let q = supabase.from('compliance_items')
    .select('*, clients(org_name), users!compliance_items_assigned_to_fkey(full_name)', { count: 'exact' });
  if (status)    q = q.eq('status', status);
  if (client_id) q = q.eq('client_id', client_id);
  if (priority)  q = q.eq('priority', priority);
  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1).order('due_date');
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count });
});

router.post('/', authorize('admin', 'manager', 'accountant'), validateCompliance, async (req, res) => {
  const { data, error } = await supabase.from('compliance_items').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', authorize('admin', 'manager', 'accountant'), validateCompliance, async (req, res) => {
  const updates = { ...req.body, updated_at: new Date() };
  if (req.body.status === 'completed' && !req.body.completed_date) {
    updates.completed_date = new Date().toISOString().split('T')[0];
  }
  const { data, error } = await supabase.from('compliance_items').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authorize('admin', 'manager', 'accountant'), async (req, res) => {
  await supabase.from('compliance_items').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

router.post('/bulk-delete', authorize('admin', 'manager', 'accountant'), async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
  const { error } = await supabase.from('compliance_items').delete().in('id', ids);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted' });
});

router.post('/bulk-update', authorize('admin', 'manager', 'accountant'), async (req, res) => {
  const { ids, updates } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
  
  const payload = { ...updates, updated_at: new Date() };
  if (updates.status === 'completed') {
    payload.completed_date = new Date().toISOString().split('T')[0];
  }

  const { error } = await supabase.from('compliance_items').update(payload).in('id', ids);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Updated' });
});

module.exports = router;

