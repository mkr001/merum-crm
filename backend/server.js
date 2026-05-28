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

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

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
app.use('/api/onboarding',  require('./routes/onboarding'));

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
