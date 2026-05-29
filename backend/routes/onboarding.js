// routes/onboarding.js
const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate, onboardingSchema } = require('../utils/validators');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { generateAgreementHTML } = require('../utils/agreementGenerator');
const { sendWelcomeEmail, sendAgreementEmail } = require('../utils/mailer');

const router = express.Router();
router.use(authenticate);

// Configure Multer for document storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(8).toString('hex') + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

// GET /api/onboarding - List submissions
router.get('/', asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;
  let q = supabase.from('client_onboardings').select('*', { count: 'exact' });

  if (req.user.roles.name === 'client') {
    q = q.eq('email', req.user.email.toLowerCase().trim());
  }

  if (status) {
    q = q.eq('status', status);
  }

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });

  let filtered = data || [];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(item => 
      item.company_name?.toLowerCase().includes(s) ||
      item.primary_contact?.toLowerCase().includes(s) ||
      item.email?.toLowerCase().includes(s)
    );
  }

  res.json({ data: filtered, total: count });
}));

// GET /api/onboarding/:id - Get details with activity timeline
router.get('/:id', asyncHandler(async (req, res) => {
  const { data: onboarding, error } = await supabase
    .from('client_onboardings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !onboarding) return res.status(404).json({ error: 'Onboarding record not found' });

  if (req.user.roles.name === 'client' && onboarding.email?.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
    return res.status(403).json({ error: 'Access denied to this onboarding record' });
  }

  // Fetch related timeline logs
  const { data: logs } = await supabase
    .from('activity_log')
    .select('*, users(full_name)')
    .eq('entity_type', 'onboarding')
    .eq('entity_id', onboarding.id)
    .order('created_at', { ascending: true });

  let filteredLogs = logs || [];
  if (req.user.roles.name === 'client') {
    filteredLogs = filteredLogs.filter(log => !log.notes.toLowerCase().includes('internal') && !log.notes.toLowerCase().includes('rejected by admin'));
  }

  res.json({ onboarding, timeline: filteredLogs });
}));

// POST /api/onboarding - Create onboarding from a lead
router.post('/', validate(onboardingSchema), asyncHandler(async (req, res) => {
  const payload = req.validatedBody;

  const { data, error } = await supabase
    .from('client_onboardings')
    .insert([{
      ...payload,
      status: 'Pending'
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { error: logErr1 } = await supabase.from('activity_log').insert([{
    performed_by: req.user.id,
    entity_type: 'onboarding',
    entity_id: data.id,
    action: 'Onboarding Started',
    notes: `Onboarding started for ${data.company_name}`
  }]);
  if (logErr1) console.error('Failed to log onboarding start:', logErr1);

  if (payload.lead_id) {
    const { error: logErr2 } = await supabase.from('activity_log').insert([{
      performed_by: req.user.id,
      entity_type: 'onboarding',
      entity_id: data.id,
      action: 'Lead Created',
      notes: `Lead details imported into onboarding`
    }]);
    if (logErr2) console.error('Failed to log lead import:', logErr2);

    await supabase.from('leads').update({ status: 'converted' }).eq('id', payload.lead_id);
  }

  // Create client user automatically
  let clientCredentials = null;
  if (data.email) {
    const { data: role } = await supabase.from('roles').select('id').eq('name', 'client').single();
    if (role) {
      const { data: existingUser } = await supabase.from('users').select('id').eq('email', data.email.toLowerCase().trim()).single();
      if (!existingUser) {
        const bcrypt = require('bcryptjs');
        const tempPassword = Math.random().toString(36).slice(-8);
        const password_hash = await bcrypt.hash(tempPassword, 12);
        const { error: userErr } = await supabase.from('users').insert([{
          full_name: data.primary_contact || data.company_name,
          email: data.email.toLowerCase().trim(),
          password_hash,
          role_id: role.id,
          is_active: true
        }]);
        if (!userErr) {
          clientCredentials = { email: data.email.toLowerCase().trim(), password: tempPassword };
          sendWelcomeEmail(clientCredentials.email, clientCredentials.password).catch(console.error);
        }
      }
    }
  }

  res.status(201).json({ ...data, clientCredentials });
}));

// PATCH /api/onboarding/:id - Update onboarding data
router.patch('/:id', asyncHandler(async (req, res) => {
  const { status, ...updates } = req.body;
  const oldStatusRes = await supabase.from('client_onboardings').select('status, email').eq('id', req.params.id).single();
  
  if (req.user.roles.name === 'client' && oldStatusRes.data?.email?.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const oldStatus = oldStatusRes.data?.status;

  const payload = { ...updates, updated_at: new Date() };
  if (status) payload.status = status;

  const { data, error } = await supabase
    .from('client_onboardings')
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log activity if status changed
  if (status && oldStatus !== status) {
    await supabase.from('activity_log').insert([{
      performed_by: req.user.id,
      entity_type: 'onboarding',
      entity_id: data.id,
      action: 'status_changed',
      notes: `Onboarding status updated from ${oldStatus} to ${status}`
    }]);
  }

  res.json(data);
}));

// POST /api/onboarding/:id/upload - Upload file and update documents checklist JSON
router.post('/:id/upload', upload.single('file'), asyncHandler(async (req, res) => {
  const { docKey } = req.body; // e.g. "pan_card", "gst_certificate"
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!docKey) return res.status(400).json({ error: 'docKey is required' });

  // Fetch current onboarding record
  const { data: record, error: fetchErr } = await supabase
    .from('client_onboardings')
    .select('documents, email')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !record) return res.status(404).json({ error: 'Onboarding record not found' });

  if (req.user.roles.name === 'client' && record.email?.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const currentDocs = record.documents || {};
  const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;

  currentDocs[docKey] = {
    uploaded: true,
    file_name: req.file.originalname,
    file_url: fileUrl,
    uploaded_at: new Date().toISOString()
  };

  const allKeys = [
    'certificate_of_incorporation', 'pan_card', 'gst_certificate', 
    'audited_financials', 'moa_aoa', 'directors_pan_aadhaar'
  ];
  const uploadedCount = allKeys.filter(k => currentDocs[k]?.uploaded).length;
  let nextStatus = 'Verification In Progress';
  if (uploadedCount < allKeys.length) {
    nextStatus = 'Documents Pending';
  }

  const { data: updated, error: updateErr } = await supabase
    .from('client_onboardings')
    .update({ 
      documents: currentDocs, 
      status: nextStatus,
      updated_at: new Date()
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Log in activity timeline
  await supabase.from('activity_log').insert([{
    performed_by: req.user.id,
    entity_type: 'onboarding',
    entity_id: req.params.id,
    action: 'Documents Uploaded',
    notes: `Document uploaded: ${req.file.originalname} (${docKey})`
  }]);

  res.json(updated);
}));

// POST /api/onboarding/:id/approve - Approve client onboarding and create profile
router.post('/:id/approve', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { send_agreement } = req.body;

  const { data: record, error: fetchErr } = await supabase
    .from('client_onboardings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !record) return res.status(404).json({ error: 'Onboarding record not found' });
  if (record.status === 'Active Client') {
    return res.status(400).json({ error: 'Client is already active and approved.' });
  }

  // If we just want to put it in review state
  if (send_agreement === false) {
    await supabase.from('client_onboardings').update({ status: 'Pending Agreement Review', updated_at: new Date() }).eq('id', req.params.id);
    return res.json({ message: 'Moved to Pending Agreement Review', status: 'Pending Agreement Review' });
  }

  // 1. Generate unique client UID (e.g. MRM-CLI-0042)
  const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  const clientUid = `MRM-CLI-${String((count || 0) + 1).padStart(4, '0')}`;

  // 2. Automatically create Client Profile
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert([{
      lead_id: record.lead_id,
      org_name: record.company_name,
      org_type: record.entity_type || 'NGO',
      registration_number: record.cin_llpin,
      pan_number: record.pan,
      gstin: record.gstin,
      address: record.registered_address,
      status: 'active'
    }])
    .select()
    .single();

  if (clientErr) return res.status(500).json({ error: `Failed to create client profile: ${clientErr.message}` });

  // 3. Create Primary Contact person
  await supabase.from('contacts').insert([{
    client_id: client.id,
    full_name: record.primary_contact,
    designation: record.designation || 'Primary Contact',
    email: record.email,
    phone: record.mobile,
    is_primary: true
  }]);

  // 4. Create Active Services from REQUIRED_SERVICES checkboxes
  // required_services is JSON array of strings: e.g. ["GST Return Filing", "ROC Compliance"]
  const servicesList = record.required_services || [];
  if (servicesList.length > 0) {
    // Lookup services in services catalog
    const { data: catalog } = await supabase.from('services').select('*').eq('is_active', true);
    if (catalog && catalog.length > 0) {
      const activeServices = servicesList.map(sName => {
        // Find matching name or default first active
        const svc = catalog.find(c => c.name.toLowerCase().includes(sName.toLowerCase())) || catalog[0];
        return {
          client_id: client.id,
          service_id: svc.id,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          agreed_price: svc.base_price,
          billing_frequency: svc.billing_type || 'monthly'
        };
      });
      await supabase.from('client_services').insert(activeServices);
    }
  }

  // 5. Update onboarding record
  await supabase
    .from('client_onboardings')
    .update({
      status: 'Active Client',
      client_id: client.id,
      client_uid: clientUid,
      updated_at: new Date()
    })
    .eq('id', req.params.id);

  // 6. Log completion events in timeline
  await supabase.from('activity_log').insert([{
    performed_by: req.user.id,
    entity_type: 'onboarding',
    entity_id: record.id,
    action: 'Verification Completed',
    notes: `All documents and details verified by ${req.user.full_name}`
  }]);

  await supabase.from('activity_log').insert([{
    performed_by: req.user.id,
    entity_type: 'onboarding',
    entity_id: record.id,
    action: 'Client Activated',
    notes: `Client profile created with ID ${clientUid}`
  }]);

  if (record.email) {
    sendAgreementEmail(record.email, record.company_name).catch(console.error);
  }

  res.json({ message: 'Onboarding approved. Client profile generated successfully!', client, clientUid });
}));

// POST /api/onboarding/:id/reject - Reject onboarding submission
router.post('/:id/reject', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const { data, error } = await supabase
    .from('client_onboardings')
    .update({ 
      status: 'Rejected',
      updated_at: new Date()
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('activity_log').insert([{
    performed_by: req.user.id,
    entity_type: 'onboarding',
    entity_id: req.params.id,
    action: 'status_changed',
    notes: `Onboarding rejected by admin. Reason: ${reason || 'Not specified'}`
  }]);

  res.json({ message: 'Onboarding rejected', data });
}));

// GET /api/onboarding/:id/agreement - Generate Service Agreement HTML
router.get('/:id/agreement', asyncHandler(async (req, res) => {
  const { data: record, error } = await supabase
    .from('client_onboardings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !record) return res.status(404).json({ error: 'Onboarding record not found' });

  let html = '';
  if (record.agreement_overrides && record.agreement_overrides.custom_html) {
    html = record.agreement_overrides.custom_html;
  } else {
    const { generateAgreementHTML } = require('../utils/agreementGenerator');
    html = generateAgreementHTML(record);
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

// POST /api/onboarding/:id/agreement - Generate Service Agreement HTML with unsaved overrides (for Live Preview)
router.post('/:id/agreement', asyncHandler(async (req, res) => {
  const { data: record, error } = await supabase
    .from('client_onboardings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !record) return res.status(404).json({ error: 'Onboarding record not found' });

  const recordWithPreviewOverrides = {
    ...record,
    agreement_overrides: req.body.overrides
  };

  const { generateAgreementHTML } = require('../utils/agreementGenerator');
  const html = generateAgreementHTML(recordWithPreviewOverrides);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

module.exports = router;
