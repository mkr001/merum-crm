-- ============================================================
-- MERUM SHARED SERVICES CRM - PostgreSQL Schema (Supabase)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS & ROLES (Internal Team)
-- ============================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,   -- admin, manager, accountant, sales, viewer
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. LEADS (Consultation Requests / Prospects)
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150),
  email VARCHAR(150),
  phone VARCHAR(20),
  org_type VARCHAR(50),              -- NGO, FPO, Research, Community, Other
  source VARCHAR(80),                -- Website, Referral, Partner, LinkedIn, Event
  status VARCHAR(50) DEFAULT 'new',  -- new, contacted, qualified, proposal_sent, converted, lost
  interest_services TEXT[],          -- e.g. {compliance, virtual_cfo, simplykhata}
  notes TEXT,
  assigned_to UUID REFERENCES users(id),
  expected_value NUMERIC(12,2),
  expected_close DATE,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CLIENTS (Converted Leads / Active Organizations)
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),        -- where they came from
  org_name VARCHAR(200) NOT NULL,
  org_type VARCHAR(50),                      -- NGO, FPO, Research, Community, Social Enterprise
  registration_number VARCHAR(100),
  pan_number VARCHAR(20),
  gstin VARCHAR(20),
  address TEXT,
  city VARCHAR(80),
  state VARCHAR(80),
  pincode VARCHAR(10),
  country VARCHAR(80) DEFAULT 'India',
  website VARCHAR(200),
  status VARCHAR(30) DEFAULT 'active',       -- active, inactive, churned
  account_manager_id UUID REFERENCES users(id),
  onboarded_on DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CONTACTS (People at Client Organizations)
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  designation VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  is_primary BOOLEAN DEFAULT FALSE,
  is_portal_user BOOLEAN DEFAULT FALSE,      -- can log into client portal
  portal_password_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. SERVICES CATALOG
-- ============================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  category VARCHAR(80),              -- BOSS, SaaS, Advisory, Compliance
  description TEXT,
  billing_type VARCHAR(30),          -- monthly, quarterly, annual, one_time
  base_price NUMERIC(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. CLIENT SERVICES (Active Service Engagements)
-- ============================================================
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  assigned_team_member UUID REFERENCES users(id),
  status VARCHAR(30) DEFAULT 'active',   -- active, paused, cancelled, completed
  start_date DATE NOT NULL,
  end_date DATE,
  renewal_date DATE,
  agreed_price NUMERIC(12,2),
  billing_frequency VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. COMPLIANCE CALENDAR
-- ============================================================
CREATE TABLE compliance_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_service_id UUID REFERENCES client_services(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed_date DATE,
  status VARCHAR(30) DEFAULT 'pending',   -- pending, in_progress, completed, overdue, waived
  priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
  assigned_to UUID REFERENCES users(id),
  reminder_days INT DEFAULT 7,
  category VARCHAR(80),                   -- tax, mca, fcra, audit, labor, other
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. TASKS & FOLLOW-UPS
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type VARCHAR(50),         -- follow_up, meeting, call, document, review, other
  related_to VARCHAR(30),        -- lead, client, compliance
  related_id UUID,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'open',   -- open, in_progress, completed, cancelled
  priority VARCHAR(20) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  doc_type VARCHAR(80),          -- agreement, compliance, financial, kyc, other
  file_url TEXT NOT NULL,
  file_name VARCHAR(200),
  file_size_kb INT,
  mime_type VARCHAR(100),
  year INT,                      -- financial year e.g. 2024
  is_confidential BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. INVOICES & BILLING
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE DEFAULT 'MRM-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(nextval('invoice_seq')::text, 4, '0'),
  client_id UUID REFERENCES clients(id),
  generated_by UUID REFERENCES users(id),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  status VARCHAR(30) DEFAULT 'draft',  -- draft, sent, paid, overdue, cancelled
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  description VARCHAR(300) NOT NULL,
  quantity NUMERIC(8,2) DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. ACTIVITY LOG
-- ============================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performed_by UUID REFERENCES users(id),
  entity_type VARCHAR(50),       -- lead, client, task, invoice, compliance
  entity_id UUID,
  action VARCHAR(80) NOT NULL,   -- created, updated, status_changed, note_added, etc.
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. PARTNERS
-- ============================================================
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80),          -- technology, finance, legal, network
  website VARCHAR(200),
  contact_person VARCHAR(150),
  contact_email VARCHAR(150),
  contact_phone VARCHAR(20),
  status VARCHAR(30) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type VARCHAR(50),              -- compliance_due, task_due, payment_due, new_lead
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  send_whatsapp BOOLEAN DEFAULT FALSE,
  send_email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. SUPPORT TICKETS
-- ============================================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  raised_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  subject VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(80),            -- billing, technical, compliance, general
  priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, urgent
  status VARCHAR(30) DEFAULT 'open',      -- open, in_progress, resolved, closed
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. CONTRACTS / PROPOSALS
-- ============================================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  contract_type VARCHAR(50),       -- proposal, agreement, sow, nda, mou
  status VARCHAR(30) DEFAULT 'draft',     -- draft, sent, negotiation, signed, expired, cancelled
  start_date DATE,
  end_date DATE,
  value NUMERIC(12,2),
  file_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_account_manager ON clients(account_manager_id);
CREATE INDEX idx_compliance_due_date ON compliance_items(due_date);
CREATE INDEX idx_compliance_status ON compliance_items(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_tickets_client ON support_tickets(client_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- ============================================================
-- SEED DATA - Roles
-- ============================================================
INSERT INTO roles (name, permissions) VALUES
('admin',      '{"all": true}'),
('manager',    '{"clients": "full", "leads": "full", "reports": "view", "invoices": "full", "team": "view"}'),
('accountant', '{"clients": "view", "invoices": "full", "compliance": "full", "documents": "full"}'),
('sales',      '{"leads": "full", "clients": "view", "tasks": "full"}'),
('viewer',     '{"clients": "view", "reports": "view"}');

-- ============================================================
-- SEED DATA - Services
-- ============================================================
INSERT INTO services (name, category, billing_type, base_price) VALUES
('Compliance Management',          'BOSS',     'monthly',    5000),
('Financial Reporting & Audit',    'BOSS',     'monthly',    8000),
('Documentation & Record Mgmt',    'BOSS',     'monthly',    3000),
('Virtual CFO',                    'Advisory', 'monthly',   15000),
('SimplyKhata - Basic',            'SaaS',     'annual',     9999),
('SimplyKhata - Pro',              'SaaS',     'annual',    19999),
('Mera Hisab - Premium',           'SaaS',     'annual',     2999),
('Technology & Process Automation','Advisory', 'one_time',  50000),
('FCRA Compliance',                'BOSS',     'quarterly',  12000),
('CSR Compliance',                 'BOSS',     'quarterly',   8000);

-- ============================================================
-- 16. CLIENT ONBOARDING FLOW
-- ============================================================
CREATE TABLE client_onboardings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'Pending', -- Pending, Documents Pending, Verification In Progress, Approved, Rejected, Active Client
  company_name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(100),
  incorporation_date DATE,
  cin_llpin VARCHAR(50),
  pan VARCHAR(20),
  gstin VARCHAR(20),
  registered_address TEXT,
  communication_address TEXT,
  primary_contact VARCHAR(150),
  designation VARCHAR(100),
  mobile VARCHAR(20),
  email VARCHAR(150),
  nature_of_business TEXT,
  industry_type VARCHAR(100),
  turnover NUMERIC(15,2),
  required_services JSONB DEFAULT '[]',
  compliance_status JSONB DEFAULT '[]',
  documents JSONB DEFAULT '{}',
  authorized_signatory VARCHAR(150),
  signature_name VARCHAR(150),
  designation_auth VARCHAR(100),
  auth_date DATE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_uid VARCHAR(50) UNIQUE,
  agreement_overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_status ON client_onboardings(status);

