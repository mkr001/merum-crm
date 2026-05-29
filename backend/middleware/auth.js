// middleware/auth.js
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(*)')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    
    // Resolve client_id if user is a client
    if (user.roles?.name === 'client' && user.email) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('client_id')
        .eq('email', user.email)
        .single();
      if (contact && contact.client_id) {
        user.client_id = contact.client_id;
      }
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.roles) {
    return res.status(401).json({ error: 'Invalid user session' });
  }
  if (req.user.roles.name === 'admin') return next();
  if (!allowedRoles.includes(req.user.roles.name)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, authorize };
