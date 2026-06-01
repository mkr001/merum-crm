// routes/notifications.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();
router.use(authenticate);

// GET /api/notifications — fetch notifications for the logged-in user
router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: data || [] });
}));

// GET /api/notifications/unread-count
router.get('/unread-count', asyncHandler(async (req, res) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .eq('is_read', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count || 0 });
}));

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', req.user.id)
    .eq('is_read', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

module.exports = router;
