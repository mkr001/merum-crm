// routes/services.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.get('/', async (req, res) => { const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('name'); if (error) return res.status(500).json({ error: error.message }); res.json({ data }); });
router.post('/', async (req, res) => { const { data, error } = await supabase.from('services').insert([req.body]).select().single(); if (error) return res.status(500).json({ error: error.message }); res.status(201).json(data); });
router.patch('/:id', async (req, res) => { const { data, error } = await supabase.from('services').update(req.body).eq('id', req.params.id).select().single(); if (error) return res.status(500).json({ error: error.message }); res.json(data); });
module.exports = router;
