// server.js — Merum CRM Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Initialize Cron Jobs ──────────────────────────────────
require('./cron')();

// ─── Security Middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);

// Strict limiter for auth (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);

// Heavy-operation limiter for bulk endpoints
const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20,
  message: { error: 'Too many bulk requests. Please wait before trying again.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api/invoices/bulk', bulkLimiter);
app.use('/api/clients/bulk',  bulkLimiter);

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/leads',       require('./routes/leads'));
app.use('/api/clients',     require('./routes/clients'));
app.use('/api/contacts',    require('./routes/contacts'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/compliance',  require('./routes/compliance'));
app.use('/api/invoices',    require('./routes/invoices'));
app.use('/api/documents',   require('./routes/documents'));
app.use('/api/services',    require('./routes/services'));
app.use('/api/partners',    require('./routes/partners'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/activity',    require('./routes/activity'));
app.use('/api/tickets',     require('./routes/tickets'));
app.use('/api/contracts',   require('./routes/contracts'));
app.use('/api/onboarding',     require('./routes/onboarding'));
app.use('/api/notifications',  require('./routes/notifications'));

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => console.log(`Merum CRM API running on port ${PORT}`));
