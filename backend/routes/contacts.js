// routes/contacts.js
const express = require('express');
const Joi = require('joi');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

const contactSchema = Joi.object({
  client_id: Joi.string().uuid().required(),
  full_name: Joi.string().max(150).required(),
  designation: Joi.string().max(100).allow('', null),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().max(20).allow('', null),
  whatsapp: Joi.string().max(20).allow('', null),
  is_primary: Joi.boolean(),
  notes: Joi.string().allow('', null)
});

const validateContact = (req, res, next) => {
  const { error } = contactSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
router.get('/',    async (req, res) => { const { client_id } = req.query; let q = supabase.from('contacts').select('*, clients(org_name)'); if (client_id) q = q.eq('client_id', client_id); const { data, error } = await q.order('is_primary', { ascending: false }); if (error) return res.status(500).json({ error: error.message }); res.json({ data }); });
router.post('/', validateContact, async (req, res) => { const { data, error } = await supabase.from('contacts').insert([req.body]).select().single(); if (error) return res.status(500).json({ error: error.message }); res.status(201).json(data); });
router.patch('/:id', async (req, res) => { const { data, error } = await supabase.from('contacts').update(req.body).eq('id', req.params.id).select().single(); if (error) return res.status(500).json({ error: error.message }); res.json(data); });
router.delete('/:id', async (req, res) => { await supabase.from('contacts').delete().eq('id', req.params.id); res.json({ message: 'Deleted' }); });
module.exports = router;
