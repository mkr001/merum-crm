// routes/compliance.js
const express = require('express');
const Joi = require('joi');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
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

const validateCompliance = (req, res, next) => {
  const { error } = complianceSchema.validate(req.body, { allowUnknown: true });
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

router.get('/', async (req, res) => {
  const { status, client_id, priority, page = 1, limit = 50 } = req.query;
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

router.post('/', validateCompliance, async (req, res) => {
  const { data, error } = await supabase.from('compliance_items').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const updates = { ...req.body, updated_at: new Date() };
  if (req.body.status === 'completed' && !req.body.completed_date) {
    updates.completed_date = new Date().toISOString().split('T')[0];
  }
  const { data, error } = await supabase.from('compliance_items').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  await supabase.from('compliance_items').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
