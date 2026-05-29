// routes/documents.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
router.use(authenticate);

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(8).toString('hex') + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

router.get('/', async (req, res) => { 
  let { client_id } = req.query;
  
  if (req.user.roles?.name === 'client') {
    if (!req.user.client_id) return res.json({ data: [] });
    client_id = req.user.client_id;
  }

  let q = supabase.from('documents').select('*, users!documents_uploaded_by_fkey(full_name), clients(org_name)'); 
  if (client_id) q = q.eq('client_id', client_id); 
  const { data, error } = await q.order('created_at', { ascending: false }); 
  if (error) return res.status(500).json({ error: error.message }); 
  res.json({ data }); 
});

// Bulk file upload
router.post('/bulk', upload.array('files', 20), async (req, res) => {
  let { client_id, doc_type } = req.body;
  
  if (req.user.roles?.name === 'client') {
    if (!req.user.client_id) return res.status(403).json({ error: 'Client ID missing for your account' });
    client_id = req.user.client_id;
  }

  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
  
  const docsToInsert = req.files.map(file => ({
    client_id: client_id || null,
    title: file.originalname,
    doc_type: doc_type || 'General',
    file_url: `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/${file.filename}`, // Fixed: Using env variable for production
    uploaded_by: req.user.id
  }));

  const { data, error } = await supabase.from('documents').insert(docsToInsert).select();
  if (error) return res.status(500).json({ error: error.message });
  
  res.status(201).json({ message: 'Files uploaded successfully', data });
});

router.post('/', async (req, res) => { 
  const payload = { ...req.body, uploaded_by: req.user.id };
  if (req.user.roles?.name === 'client') {
    payload.client_id = req.user.client_id;
  }
  const { data, error } = await supabase.from('documents').insert([payload]).select().single(); 
  if (error) return res.status(500).json({ error: error.message }); 
  res.status(201).json(data); 
});

router.delete('/:id', async (req, res) => { 
  if (req.user.roles?.name === 'client') {
    return res.status(403).json({ error: 'Clients cannot delete documents directly' });
  }
  await supabase.from('documents').delete().eq('id', req.params.id); 
  res.json({ message: 'Deleted' }); 
});

module.exports = router;
