// routes/tasks.js
const express = require('express');
const Joi = require('joi');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

const taskSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  task_type: Joi.string().max(50).allow('', null),
  related_to: Joi.string().max(30).allow('', null),
  related_id: Joi.string().uuid().allow('', null),
  assigned_to: Joi.string().uuid().allow('', null),
  due_date: Joi.date().allow('', null),
  status: Joi.string().max(30).allow('', null),
  priority: Joi.string().max(20).allow('', null),
  notes: Joi.string().allow('', null)
});

const validateTask = (req, res, next) => {
  const { error } = taskSchema.validate(req.body, { allowUnknown: true });
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

router.get('/', async (req, res) => {
  const { status, assigned_to, related_id, related_to, task_type, page = 1, limit = 50 } = req.query;
  let q = supabase.from('tasks').select('*, users!tasks_assigned_to_fkey(full_name)', { count: 'exact' });
  
  if (status) q = q.eq('status', status);
  if (task_type) q = q.eq('task_type', task_type);
  if (related_id) q = q.eq('related_id', related_id);
  if (related_to) q = q.eq('related_to', related_to);
  
  if (assigned_to) {
    q = q.eq('assigned_to', assigned_to);
  } else if (!related_id) {
    // default: my tasks, unless we are looking for a specific entity's tasks
    q = q.eq('assigned_to', req.user.id);
  }
  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1).order('due_date', { nullsFirst: false });
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count });
});

router.post('/', validateTask, async (req, res) => {
  const payload = { ...req.body, created_by: req.user.id, assigned_to: req.body.assigned_to || req.user.id };
  const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', validateTask, async (req, res) => {
  try {
    const { id, users, created_at, created_by, ...updateData } = req.body;
    console.log('Patching task ID:', req.params.id);
    const { data, error } = await supabase.from('tasks')
      .update({ ...updateData, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase Update Error:', error);
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Update Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await supabase.from('tasks').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
