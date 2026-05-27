// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Step 1 — Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.trim() === '') {
    return res.status(400).json({ error: 'Password cannot be empty' });
  }

  // Step 2 — Find user by email
  const { data: user, error } = await supabase
    .from('users')
    .select('*, roles(*)')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Step 3 — Check if user has a password set
  if (!user.password_hash) {
    return res.status(401).json({ error: 'Account not set up. Please contact your administrator to set your password.' });
  }

  // Step 4 — Compare password with bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Step 5 — Generate JWT token only after successful auth
  const token = jwt.sign(
    { userId: user.id, role: user.roles.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  // Step 6 — Update last login time
  await supabase.from('users').update({ last_login: new Date() }).eq('id', user.id);

  // Step 7 — Return token and user info (never return password_hash)
  res.json({
    token,
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.roles.name,
      avatar: user.avatar_url
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => res.json({ message: 'Logged out successfully' }));

// POST /api/auth/change-password (logged in users change their own password)
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both current and new password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user } = await supabase.from('users').select('*').eq('id', decoded.userId).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

    const new_hash = await bcrypt.hash(new_password, 12);
    await supabase.from('users').update({ password_hash: new_hash }).eq('id', decoded.userId);

    res.json({ message: 'Password changed successfully' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
