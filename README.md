# Merum CRM — Complete Setup Guide

A full-stack CRM built specifically for **Merum Shared Services** — managing NGO, FPO, and rural enterprise clients.

---

## 🗂 Project Structure

```
merum-crm/
├── database/
│   └── schema.sql          ← Run this in Supabase SQL editor
├── backend/
│   ├── server.js           ← Node.js Express server
│   ├── .env.example        ← Copy to .env and fill values
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   └── auth.js         ← JWT authentication
│   └── routes/             ← All API endpoints
│       ├── auth.js
│       ├── leads.js
│       ├── clients.js
│       ├── tasks.js
│       ├── compliance.js
│       ├── invoices.js
│       ├── documents.js
│       ├── dashboard.js
│       └── ...
└── frontend/
    └── src/
        ├── App.jsx
        ├── context/AuthContext.jsx
        ├── utils/api.js
        ├── components/Layout.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Leads.jsx
            ├── Clients.jsx
            ├── Tasks.jsx
            ├── Compliance.jsx
            ├── Invoices.jsx
            └── ...
```

---

## 🚀 Step-by-Step Setup

### Step 1 — Create Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose **India (Mumbai)** region
3. Go to **SQL Editor** → paste contents of `database/schema.sql` → Run
4. Go to **Settings → API** → copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

---

### Step 2 — Setup Backend

```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials in .env
npm install
npm run dev
# API runs on http://localhost:5000
```

#### Add your first admin user in Supabase:
Go to Supabase → Table Editor → `users` → Insert row:
```json
{
  "full_name": "Your Name",
  "email": "admin@merums.com",
  "role_id": "<admin role UUID from roles table>"
}
```

---

### Step 3 — Setup Frontend

```bash
cd frontend
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
npm install
npm start
# Opens http://localhost:3000
```

---

### Step 4 — Deploy to Production

#### Frontend → Netlify (Free)
```bash
cd frontend
npm run build
# Drag the 'build' folder to netlify.com/drop
# OR connect your GitHub repo for auto-deploy
```

Set environment variable in Netlify:
```
REACT_APP_API_URL = https://your-backend.railway.app/api
```

#### Backend → Railway.app (Free tier)
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your backend folder
3. Add environment variables from `.env`
4. Railway gives you a URL like `https://merum-crm.railway.app`

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List leads (filter: status, assigned_to) |
| POST | `/api/leads` | Create lead |
| PATCH | `/api/leads/:id` | Update lead |
| PATCH | `/api/leads/:id/convert` | Convert to client |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients |
| GET | `/api/clients/:id` | Client detail (with contacts, services) |
| POST | `/api/clients` | Create client |
| PATCH | `/api/clients/:id` | Update client |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (default: my tasks) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |

### Compliance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance` | List items (filter: status, client_id) |
| POST | `/api/compliance` | Create compliance item |
| PATCH | `/api/compliance/:id` | Update (mark complete etc.) |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice with line items |
| PATCH | `/api/invoices/:id` | Update status |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/kpis` | KPI summary + recent activity |
| GET | `/api/dashboard/pipeline` | Lead pipeline by stage |
| GET | `/api/dashboard/upcoming-compliance` | Due in 30 days |

---

## 🔐 User Roles & Permissions

| Role | Access |
|------|--------|
| **admin** | Full access to everything |
| **manager** | Leads, clients, tasks, invoices, reports |
| **accountant** | Invoices, compliance, documents |
| **sales** | Leads, tasks, view clients |
| **viewer** | Read-only access |

---

## 💰 Hosting Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free (500MB DB) | ₹0 |
| Railway.app | Starter (500hr/month) | ₹0 – ₹400 |
| Netlify | Free | ₹0 |
| **Total** | | **₹0 – ₹400/month** |

Upgrade Supabase to Pro (₹2,000/month) when you exceed 500MB data.

---

## 🔮 Phase 2 Features (Next)

- [ ] WhatsApp notifications (via Twilio/2Factor API)
- [ ] Email reminders for compliance deadlines
- [ ] Client portal (login for NGOs to see their status)
- [ ] PDF invoice generation
- [ ] SimplyKhata / Mera Hisab integration
- [ ] Mobile app (React Native)

---

## 👨‍💻 Developer Notes

- All dates stored as `TIMESTAMPTZ` in UTC, display in IST on frontend
- Invoice numbers auto-generated: `MRM-YYYYMM-XXXX`
- Role-based access enforced at API level via JWT middleware
- Supabase RLS (Row Level Security) can be added for extra protection
- Activity log tracks all create/update actions automatically

**Tech Stack Summary:**
- Frontend: React 18 + React Router v6 + Recharts
- Backend: Node.js + Express + Supabase JS SDK
- Database: PostgreSQL on Supabase
- Auth: JWT tokens (8hr expiry)
- Hosting: Netlify (frontend) + Railway (backend) + Supabase (DB)
