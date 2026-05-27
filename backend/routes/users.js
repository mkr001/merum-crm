// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

// GET /api/users — list all active users
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, is_active, last_login, created_at, roles(name)')
    .order('full_name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /api/users — Admin creates a new user with password
router.post('/', authorize('admin'), async (req, res) => {
  const { full_name, email, password, role_name, phone } = req.body;

  // Validate
  if (!full_name || !email || !password || !role_name) {
    return res.status(400).json({ error: 'Full name, email, password and role are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', email.toLowerCase()).single();
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists' });
  }

  // Get role id
  const { data: role } = await supabase
    .from('roles').select('id').eq('name', role_name).single();
  if (!role) return res.status(400).json({ error: 'Invalid role selected' });

  // Hash password
  const password_hash = await bcrypt.hash(password, 12);

  // Create user
  const { data, error } = await supabase.from('users').insert([{
    full_name,
    email: email.toLowerCase().trim(),
    password_hash,
    phone,
    role_id: role.id,
    is_active: true
  }]).select('id, full_name, email, phone, is_active, roles(name)').single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/users/:id — Admin updates user
router.patch('/:id', authorize('admin'), async (req, res) => {
  const { password, role_name, ...updates } = req.body;

  // If changing password
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    updates.password_hash = await bcrypt.hash(password, 12);
  }

  // If changing role
  if (role_name) {
    const { data: role } = await supabase.from('roles').select('id').eq('name', role_name).single();
    if (!role) return res.status(400).json({ error: 'Invalid role' });
    updates.role_id = role.id;
  }

  const { data, error } = await supabase
    .from('users').update(updates).eq('id', req.params.id)
    .select('id, full_name, email, phone, is_active, roles(name)').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE (deactivate) /api/users/:id
router.patch('/:id/deactivate', authorize('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('users').update({ is_active: false }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'User deactivated successfully', data });
});

module.exports = router;
