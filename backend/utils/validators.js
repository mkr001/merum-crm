// utils/validators.js — Centralized Joi validation schemas for all entities
const Joi = require('joi');

// ── Reusable field patterns ─────────────────────────────────────
const uuid = Joi.string().uuid();
const optionalString = (max = 200) => Joi.string().max(max).allow('', null);
const optionalUuid = Joi.string().uuid().allow('', null);
const optionalDate = Joi.date().allow('', null);

// ── Auth ────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(1).required().messages({
    'any.required': 'Password is required'
  })
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().min(1).required(),
  new_password: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters'
  })
});

// ── Leads ───────────────────────────────────────────────────────
const leadCreateSchema = Joi.object({
  org_name: Joi.string().max(200).required().messages({
    'any.required': 'Organization name is required'
  }),
  contact_person: optionalString(150),
  email: Joi.string().email().allow('', null),
  phone: optionalString(20),
  org_type: Joi.string().valid('NGO', 'FPO', 'Research', 'Community', 'Other').allow('', null),
  source: optionalString(80),
  status: Joi.string().valid('new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost').allow('', null),
  interest_services: Joi.array().items(Joi.string()).allow(null),
  notes: optionalString(5000),
  assigned_to: optionalUuid,
  expected_value: Joi.number().precision(2).min(0).allow(null),
  expected_close: optionalDate
});

const leadUpdateSchema = leadCreateSchema.fork(
  ['org_name'], (schema) => schema.optional()
);

// ── Clients ─────────────────────────────────────────────────────
const clientCreateSchema = Joi.object({
  org_name: Joi.string().max(200).required(),
  org_type: optionalString(50),
  registration_number: optionalString(100),
  pan_number: optionalString(20),
  gstin: optionalString(20),
  address: optionalString(500),
  city: optionalString(80),
  state: optionalString(80),
  pincode: optionalString(10),
  country: optionalString(80),
  website: optionalString(200),
  status: Joi.string().valid('active', 'inactive', 'churned').allow('', null),
  account_manager_id: optionalUuid,
  lead_id: optionalUuid
}).options({ stripUnknown: false });

const clientUpdateSchema = clientCreateSchema.fork(
  ['org_name'], (schema) => schema.optional()
);

// ── Invoices ────────────────────────────────────────────────────
const invoiceCreateSchema = Joi.object({
  client_id: uuid.optional().allow('', null),
  new_client_name: Joi.string().max(200).allow('', null), // used when client is not onboarded
  new_client_gstin: optionalString(20),
  new_client_address: optionalString(500),
  new_client_city: optionalString(80),
  new_client_state: optionalString(80),
  new_client_pincode: optionalString(10),
  issue_date: optionalDate,
  due_date: optionalDate,
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').allow('', null),
  tax_rate: Joi.number().precision(2).min(0).max(100).allow(null),
  payment_method: optionalString(50),
  payment_reference: optionalString(100),
  notes: optionalString(5000),
  items: Joi.array().items(Joi.object({
    service_id: optionalUuid,
    description: Joi.string().max(300).required(),
    quantity: Joi.number().min(0).default(1),
    unit_price: Joi.number().precision(2).min(0).required()
  })).default([])
}).or('client_id', 'new_client_name').options({ stripUnknown: true });

// ── Contracts ───────────────────────────────────────────────────
const contractCreateSchema = Joi.object({
  client_id: uuid.required(),
  title: Joi.string().max(300).required(),
  contract_type: Joi.string().valid('proposal', 'agreement', 'sow', 'nda', 'mou').allow('', null),
  status: Joi.string().valid('draft', 'sent', 'negotiation', 'signed', 'expired', 'cancelled').allow('', null),
  start_date: optionalDate,
  end_date: optionalDate,
  value: Joi.number().precision(2).min(0).allow(null),
  file_url: optionalString(2000),
  notes: optionalString(5000)
}).options({ allowUnknown: true });

const contractUpdateSchema = contractCreateSchema.fork(
  ['client_id', 'title'], (schema) => schema.optional()
);

// ── Tickets ─────────────────────────────────────────────────────
const ticketCreateSchema = Joi.object({
  client_id: uuid.required(),
  subject: Joi.string().max(300).required(),
  description: optionalString(5000),
  category: Joi.string().valid('billing', 'technical', 'compliance', 'general').allow('', null),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').allow('', null),
  assigned_to: optionalUuid
}).options({ allowUnknown: true });

const ticketUpdateSchema = ticketCreateSchema.fork(
  ['client_id', 'subject'], (schema) => schema.optional()
).keys({
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').allow('', null),
  resolution_notes: optionalString(5000),
  resolved_at: optionalDate
});

// ── Users ───────────────────────────────────────────────────────
const userCreateSchema = Joi.object({
  full_name: Joi.string().max(150).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters'
  }),
  role_name: Joi.string().valid('admin', 'manager', 'accountant', 'sales', 'viewer').required(),
  phone: optionalString(20)
});

// ── Onboarding ──────────────────────────────────────────────────
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z0][A-Z0-9]{1}$/;
const mobileRegex = /^[0-9]{10}$/;

const onboardingSchema = Joi.object({
  lead_id: optionalUuid,
  company_name: Joi.string().max(200).required().messages({
    'any.required': 'Company Name is required'
  }),
  entity_type: optionalString(100),
  incorporation_date: optionalDate,
  cin_llpin: optionalString(50),
  pan: Joi.string().regex(panRegex).required().messages({
    'string.pattern.base': 'Please enter a valid 10-digit PAN (e.g. ABCDE1234F)',
    'any.required': 'PAN is required'
  }),
  gstin: Joi.string().regex(gstinRegex).allow('', null).messages({
    'string.pattern.base': 'Please enter a valid 15-digit GSTIN'
  }),
  registered_address: optionalString(1000),
  communication_address: optionalString(1000),
  primary_contact: Joi.string().max(150).required().messages({
    'any.required': 'Primary Contact Person is required'
  }),
  designation: optionalString(100),
  mobile: Joi.string().regex(mobileRegex).required().messages({
    'string.pattern.base': 'Please enter a valid 10-digit mobile number',
    'any.required': 'Mobile Number is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email ID is required'
  }),
  nature_of_business: optionalString(1000),
  industry_type: optionalString(100),
  turnover: Joi.number().min(0).allow(null),
  required_services: Joi.array().items(Joi.string()).default([]),
  compliance_status: Joi.array().items(Joi.object({
    particular: Joi.string().required(),
    filed_up_to_date: Joi.boolean().default(true),
    pending_since: optionalString(100).allow('', null),
    remarks: optionalString(500).allow('', null)
  })).default([]),
  authorized_signatory: Joi.string().max(150).required().messages({
    'any.required': 'Authorized Signatory is required'
  }),
  signature_name: Joi.string().max(150).required().messages({
    'any.required': 'Signature confirmation name is required'
  }),
  designation_auth: Joi.string().max(100).required().messages({
    'any.required': 'Designation in Section F is required'
  }),
  auth_date: Joi.date().required().messages({
    'any.required': 'Date in Section F is required'
  })
}).options({ allowUnknown: true });

// ── Validation middleware factory ───────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map(d => d.message).join('; ');
      return res.status(400).json({ error: messages });
    }
    req.validatedBody = value;
    next();
  };
}

module.exports = {
  validate,
  loginSchema,
  changePasswordSchema,
  leadCreateSchema,
  leadUpdateSchema,
  clientCreateSchema,
  clientUpdateSchema,
  invoiceCreateSchema,
  contractCreateSchema,
  contractUpdateSchema,
  ticketCreateSchema,
  ticketUpdateSchema,
  userCreateSchema,
  onboardingSchema
};

