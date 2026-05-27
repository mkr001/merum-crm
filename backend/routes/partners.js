// routes/partners.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.get('/', async (req, res) => { const { data, error } = await supabase.from('partners').select('*').order('name'); if (error) return res.status(500).json({ error: error.message }); res.json({ data }); });
router.post('/', async (req, res) => { const { data, error } = await supabase.from('partners').insert([req.body]).select().single(); if (error) return res.status(500).json({ error: error.message }); res.status(201).json(data); });
router.patch('/:id', async (req, res) => { const { data, error } = await supabase.from('partners').update(req.body).eq('id', req.params.id).select().single(); if (error) return res.status(500).json({ error: error.message }); res.json(data); });
router.delete('/:id', async (req, res) => { await supabase.from('partners').delete().eq('id', req.params.id); res.json({ message: 'Deleted' }); });
module.exports = router;
