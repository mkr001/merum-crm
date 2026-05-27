// routes/activity.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const { entity_id, entity_type } = req.query;
  let q = supabase.from('activity_log').select('*, users!activity_log_performed_by_fkey(full_name)');
  if (entity_id) q = q.eq('entity_id', entity_id);
  if (entity_type) q = q.eq('entity_type', entity_type);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

module.exports = router;
