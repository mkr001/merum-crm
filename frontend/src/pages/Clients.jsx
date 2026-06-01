// src/pages/Clients.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Building2, ChevronRight, Trash2, Upload,
  Download, X, LayoutGrid, List, Copy, Check, RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import useResponsive from '../utils/useResponsive';

// ─── Constants ────────────────────────────────────────────────
const ORG_TYPES = ['NGO', 'FPO', 'Research', 'Community', 'Social Enterprise', 'Other'];
const PAGE_SIZE  = 48;

const STATUS_META = {
  active:   { bg: '#eaf3de', color: '#3b6d11', label: 'Active'   },
  inactive: { bg: '#f8f7f4', color: '#888',    label: 'Inactive' },
  churned:  { bg: '#fff3cd', color: '#856404', label: 'Churned'  },
  deleted:  { bg: '#fcebeb', color: '#a32d2d', label: 'Deleted'  },
};

const AVATAR_COLORS = ['#2d9d78','#3b8bd4','#C70073','#534ab7','#ef9f27','#e24b4a','#0891b2','#7c3aed'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─── Helpers ──────────────────────────────────────────────────
function copyText(text, label) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => toast.error('Copy failed'));
}

function Skeleton({ w = '100%', h = 14, r = 6, mb = 0 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
  );
}

// ─── Client Modal ─────────────────────────────────────────────
function ClientModal({ client, onClose, onSave, isOnboarding = false }) {
  const { isMobile } = useResponsive();
  const [form, setForm] = useState(client || { status: 'active', country: 'India' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };
  const foc = e => { e.target.style.borderColor = '#2d9d78'; };
  const blr = e => { e.target.style.borderColor = '#e8e5e0'; };

  const handleSave = async () => {
    if (!form.org_name?.trim()) return toast.error('Organization name is required');
    setSaving(true);
    try {
      let data;
      if (form.id) { ({ data } = await api.patch(`/clients/${form.id}`, form)); }
      else         { ({ data } = await api.post('/clients', form)); }
      onSave(data);
      if (!isOnboarding) onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save client');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? '95%' : 600, maxHeight: '92vh', overflowY: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOnboarding ? 12 : 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isOnboarding ? 'Onboard Client' : form.id ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
        </div>

        {isOnboarding && (
          <div style={{ background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 9, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#e65100' }}>
            ⚠️ Complete the details below to formally onboard this client into the system.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Organization Name *</label>
            <input style={inp} value={form.org_name || ''} onChange={e => set('org_name', e.target.value)} placeholder="e.g. Gram Vikas Foundation" onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Org Type</label>
            <select style={inp} value={form.org_type || ''} onChange={e => set('org_type', e.target.value)} onFocus={foc} onBlur={blr}>
              <option value="">Select type…</option>
              {ORG_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status || 'active'} onChange={e => set('status', e.target.value)} onFocus={foc} onBlur={blr}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>
          <div>
            <label style={lbl}>PAN Number</label>
            <input style={inp} value={form.pan_number || ''} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>GSTIN</label>
            <input style={inp} value={form.gstin || ''} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Registration No.</label>
            <input style={inp} value={form.registration_number || ''} onChange={e => set('registration_number', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Website</label>
            <input style={inp} value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://example.com" onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>City</label>
            <input style={inp} value={form.city || ''} onChange={e => set('city', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>State</label>
            <input style={inp} value={form.state || ''} onChange={e => set('state', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Pincode</label>
            <input style={inp} value={form.pincode || ''} onChange={e => set('pincode', e.target.value)} placeholder="400001" onFocus={foc} onBlur={blr} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Address</label>
            <textarea style={{ ...inp, minHeight: 68, resize: 'vertical' }} value={form.address || ''} onChange={e => set('address', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>

          {/* SaaS toggles */}
          <div style={{ gridColumn: '1/-1', borderTop: '1px solid #f0ede8', paddingTop: 16, marginTop: 4 }}>
            <label style={{ ...lbl, fontSize: 13, color: '#C70073', fontWeight: 700, marginBottom: 10 }}>Active Merum SaaS Solutions</label>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { key: 'simplykhata_active', label: 'SimplyKhata deployed', color: '#00a99d' },
                { key: 'merahisab_active',   label: 'Mera Hisab deployed',  color: '#534ab7' },
              ].map(({ key, label, color }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: color }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid #f0ede8' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 22px', background: saving ? '#ccc' : isOnboarding ? '#e67e22' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : isOnboarding ? 'Onboard Client' : form.id ? 'Update Client' : 'Save Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Upload Modal ────────────────────────────────────────
function BulkUploadModal({ onClose, onSave }) {
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults]     = useState(null);

  const downloadTemplate = () => {
    const headers = ['org_name','org_type','city','state','pincode','address','pan_number','gstin','registration_number','website','status'];
    const sample  = ['Gram Vikas Foundation','NGO','Mumbai','Maharashtra','400001','123 Main St','ABCDE1234F','22AAAAA0000A1Z5','NGO12345','https://gramvikas.org','active'];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, 'clients_bulk_template.xlsx');
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file');
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!rows.length) return toast.error('File is empty');
      const res = await api.post('/clients/bulk', { clients: rows });
      setResults(res.data);
      if (res.data.inserted > 0) { toast.success(`${res.data.inserted} clients added`); onSave(); }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 500, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Bulk Upload Clients</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
        </div>
        {!results ? (
          <>
            <div style={{ background: '#f8f7f4', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Required columns:</span>
                <button onClick={downloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={12} /> Download Template
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['org_name *','org_type','city','state','pan_number','gstin','status'].map(c => (
                  <span key={c} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#fff', border: '1px solid #e8e5e0', color: c.includes('*') ? '#C70073' : '#555', fontWeight: c.includes('*') ? 700 : 400 }}>{c}</span>
                ))}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: '#888' }}>Maximum 500 clients per upload.</p>
            </div>
            <div style={{ border: '2px dashed #e0ddd8', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 20, cursor: 'pointer' }}
              onClick={() => document.getElementById('client-file-in').click()}>
              <Upload size={28} color="#bbb" style={{ display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, color: '#888' }}>{file ? file.name : 'Click to select .xlsx or .csv'}</div>
              <input id="client-file-in" type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !file}
                style={{ padding: '9px 22px', background: uploading || !file ? '#ccc' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: uploading || !file ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploading ? 'Uploading…' : <><Upload size={14} /> Upload Clients</>}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Upload Complete</h3>
            <p style={{ color: '#555' }}><b style={{ color: '#2d9d78' }}>{results.inserted}</b> inserted · <b style={{ color: '#e24b4a' }}>{results.skipped}</b> skipped</p>
            <button onClick={onClose} style={{ marginTop: 20, padding: '9px 28px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Client Card (Grid view) ──────────────────────────────────
function ClientCard({ client, onOffboard, onClick }) {
  const [copied, setCopied] = useState(null);
  const isOffboard = client.is_offboard;
  const m = STATUS_META[client.status] || STATUS_META.inactive;
  const ac = avatarColor(client.org_name);

  const handleCopy = (e, text, label) => {
    e.stopPropagation();
    copyText(text, label);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div onClick={onClick}
      style={{ background: isOffboard ? '#fffaf5' : '#fff',
        border: `1.5px solid ${client.status === 'deleted' ? '#f5c6c6' : isOffboard ? '#ffb74d' : '#e8e6e0'}`,
        borderRadius: 13, padding: '18px 20px', cursor: isOffboard ? 'default' : 'pointer',
        transition: 'border-color .18s, box-shadow .18s, transform .18s',
        opacity: client.status === 'deleted' ? 0.82 : 1,
      }}
      onMouseEnter={e => { if (!isOffboard) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#2d9d78'; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = client.status === 'deleted' ? '#f5c6c6' : isOffboard ? '#ffb74d' : '#e8e6e0'; }}>

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: ac + '22', border: `1.5px solid ${ac}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: ac, flexShrink: 0 }}>
            {client.org_name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{client.org_name}</div>
            <div style={{ fontSize: 11.5, color: '#888' }}>{client.org_type || 'Organization'}</div>
          </div>
        </div>
        <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 20, background: m.bg, color: m.color, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {m.label}
        </span>
      </div>

      {/* Location */}
      {(client.city || client.state) && (
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          📍 {[client.city, client.state].filter(Boolean).join(', ')}
        </div>
      )}

      {/* Account Manager */}
      {client.users?.full_name && (
        <div style={{ fontSize: 11.5, color: '#666', marginBottom: 8 }}>
          👤 AM: <b>{client.users.full_name}</b>
        </div>
      )}

      {/* GSTIN with copy */}
      {client.gstin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#aaa', background: '#f8f7f4', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>
            {client.gstin}
          </span>
          <button onClick={e => handleCopy(e, client.gstin, 'GSTIN')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'GSTIN' ? '#2d9d78' : '#bbb', padding: 2, display: 'flex' }}>
            {copied === 'GSTIN' ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      )}

      {/* SaaS tags */}
      {(client.simplykhata_active || client.merahisab_active) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {client.simplykhata_active && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#e0faf8', color: '#006b65', fontWeight: 600 }}>SimplyKhata</span>}
          {client.merahisab_active   && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#eeedfe', color: '#534ab7', fontWeight: 600 }}>Mera Hisab</span>}
        </div>
      )}

      {/* Onboarding progress */}
      {client.status === 'active' && client.onboarding_total > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#888', marginBottom: 4 }}>
            <span>Onboarding</span>
            <span style={{ fontWeight: 700, color: client.onboarding_progress === 100 ? '#2d9d78' : '#888' }}>{client.onboarding_progress}%</span>
          </div>
          <div style={{ height: 5, background: '#f0ede8', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ width: `${client.onboarding_progress}%`, height: '100%', borderRadius: 10,
              background: client.onboarding_progress === 100 ? '#2d9d78' : '#3b8bd4', transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #f8f7f4', marginTop: 4 }}>
        {isOffboard ? (
          <button onClick={e => { e.stopPropagation(); onOffboard(client); }}
            style={{ padding: '5px 13px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Onboard Now →
          </button>
        ) : (
          <ChevronRight size={14} color="#bbb" />
        )}
      </div>
    </div>
  );
}

// ─── Client Row (List view) ───────────────────────────────────
function ClientRow({ client, onOffboard, onClick }) {
  const isOffboard = client.is_offboard;
  const m = STATUS_META[client.status] || STATUS_META.inactive;
  const ac = avatarColor(client.org_name);

  return (
    <tr onClick={onClick}
      style={{ borderBottom: '1px solid #f0ede8', cursor: isOffboard ? 'default' : 'pointer', transition: 'background .12s' }}
      onMouseEnter={e => { if (!isOffboard) e.currentTarget.style.background = '#faf9f7'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: ac + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: ac, flexShrink: 0 }}>
            {client.org_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1a1a18' }}>{client.org_name}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{client.org_type || ''}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '13px 14px', fontSize: 13, color: '#555' }}>{[client.city, client.state].filter(Boolean).join(', ') || '—'}</td>
      <td style={{ padding: '13px 14px', fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{client.gstin || '—'}</td>
      <td style={{ padding: '13px 14px', fontSize: 12, color: '#666' }}>{client.users?.full_name || '—'}</td>
      <td style={{ padding: '13px 14px' }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: m.bg, color: m.color, fontWeight: 700 }}>{m.label}</span>
        {isOffboard && <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#fff3e0', color: '#e65100', fontWeight: 600 }}>Offboard</span>}
      </td>
      <td style={{ padding: '13px 14px' }}>
        {isOffboard ? (
          <button onClick={e => { e.stopPropagation(); onOffboard(client); }}
            style={{ padding: '4px 12px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Onboard Now
          </button>
        ) : (
          <ChevronRight size={14} color="#bbb" />
        )}
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Clients() {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clients, setClients]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [search, setSearch]             = useState('');
  const [viewTab, setViewTab]           = useState('active');
  const [viewMode, setViewMode]         = useState('grid'); // 'grid' | 'list'
  const [page, setPage]                 = useState(1);
  const [modal, setModal]               = useState(null);
  const [bulkModal, setBulkModal]       = useState(false);
  const [onboardingClient, setOnboardingClient] = useState(null);

  const isAdmin = ['admin','manager'].includes(user?.role);

  const fetchClients = useCallback(async (tab = viewTab, pg = page) => {
    setLoading(true);
    setError(null);
    try {
      let params = { page: pg, limit: PAGE_SIZE };
      if (tab === 'deleted')  params.status = 'deleted';
      else if (tab === 'offboard') params.is_offboard = 'true';
      const { data } = await api.get('/clients', { params });
      setClients(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load clients');
    } finally { setLoading(false); }
  }, [viewTab, page]);

  useEffect(() => { setPage(1); fetchClients(viewTab, 1); setSearch(''); }, [viewTab]);
  useEffect(() => { if (page > 1) fetchClients(viewTab, page); }, [page]);

  const handleOnboardSave = async (savedClient) => {
    try {
      await api.patch(`/clients/${savedClient.id}/onboard`);
      toast.success(`${savedClient.org_name} is now onboarded!`);
      fetchClients();
    } catch { toast.error('Could not mark client as onboarded'); }
    setOnboardingClient(null);
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('No clients to export');
    const rows = filtered.map(c => ({
      'Name': c.org_name, 'Type': c.org_type || '', 'Status': c.status,
      'City': c.city || '', 'State': c.state || '',
      'GSTIN': c.gstin || '', 'PAN': c.pan_number || '',
      'Website': c.website || '', 'AM': c.users?.full_name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, `clients_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Client-side search on current page
  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      (c.org_name || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q) ||
      (c.pan_number || '').toLowerCase().includes(q) ||
      (c.users?.full_name || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const TABS = [
    { key: 'active',   label: 'Active',   color: '#2d9d78' },
    { key: 'inactive', label: 'Inactive', color: '#888'    },
    { key: 'churned',  label: 'Churned',  color: '#856404' },
    { key: 'offboard', label: '⚠️ Offboard', color: '#e67e22' },
    ...(isAdmin ? [{ key: 'deleted', label: '🗑 Deleted', color: '#e24b4a' }] : []),
  ];

  const navigateToClient = (client) => {
    if (!client.is_offboard && client.status !== 'deleted') navigate(`/clients/${client.id}`);
  };

  return (
    <div>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .client-row:hover { background: #faf9f7 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>Clients</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{total.toLocaleString()} {viewTab} clients</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1.5px solid #e8e5e0', borderRadius: 9, overflow: 'hidden' }}>
            {[{ mode: 'grid', Icon: LayoutGrid }, { mode: 'list', Icon: List }].map(({ mode, Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding: '7px 11px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s',
                  background: viewMode === mode ? '#1a1a18' : '#fff', color: viewMode === mode ? '#fff' : '#888' }}>
                <Icon size={16} />
              </button>
            ))}
          </div>
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
          <button onClick={() => setBulkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Bulk Upload
          </button>
          <button onClick={() => fetchClients(viewTab, page)}
            style={{ padding: '9px 11px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(({ key, label, color }) => {
          const active = viewTab === key;
          return (
            <button key={key} onClick={() => setViewTab(key)}
              style={{ padding: '7px 18px', borderRadius: 20, border: `1.5px solid ${active ? color : '#e8e5e0'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                background: active ? color + '18' : '#fff', color: active ? color : '#666', transition: 'all .15s' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Banners ── */}
      {viewTab === 'offboard' && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 10, padding: '11px 16px', marginBottom: 16, fontSize: 13, color: '#e65100', fontWeight: 500 }}>
          ⚠️ These clients were auto-created during invoice generation. Click <b>Onboard Now</b> to complete their profile.
        </div>
      )}
      {viewTab === 'deleted' && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '11px 16px', marginBottom: 16, fontSize: 13, color: '#a32d2d', fontWeight: 500 }}>
          🗑️ Showing archived clients. Click any client to view details or restore them.
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 18 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, city, GSTIN, PAN, AM…"
          style={{ width: '100%', padding: '9px 36px 9px 34px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#a32d2d', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          ⚠️ {error}
          <button onClick={() => fetchClients()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a32d2d', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* ── Grid View ── */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 13, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <Skeleton w={40} h={40} r={10} />
                    <div style={{ flex: 1 }}><Skeleton w="65%" h={14} mb={7} /><Skeleton w="40%" h={10} /></div>
                  </div>
                  <Skeleton w="55%" h={11} mb={8} />
                  <Skeleton w="80%" h={11} mb={8} />
                  <Skeleton w="100%" h={6} r={4} />
                </div>
              ))
            : filtered.length === 0
              ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
                  <Building2 size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No clients found</div>
                  <div style={{ fontSize: 13 }}>{search ? 'Try a different search' : `No ${viewTab} clients yet`}</div>
                </div>
              )
              : filtered.map(client => (
                  <ClientCard key={client.id} client={client}
                    onOffboard={setOnboardingClient}
                    onClick={() => navigateToClient(client)} />
                ))
          }
        </div>
      )}

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 13, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
                {['Client', 'Location', 'GSTIN', 'Account Manager', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                      {[1,2,3,4,5,6].map(j => (
                        <td key={j} style={{ padding: '13px 16px' }}><Skeleton w="70%" h={13} /></td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
                      <Building2 size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.2 }} />
                      No clients found
                    </td></tr>
                  : filtered.map(client => (
                      <ClientRow key={client.id} client={client}
                        onOffboard={setOnboardingClient}
                        onClick={() => navigateToClient(client)} />
                    ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px', marginTop: 10 }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ padding: '7px 12px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===1 ? 'not-allowed' : 'pointer', opacity: page===1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
              ← Prev
            </button>
            <span style={{ padding: '7px 14px', background: '#1a1a18', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding: '7px 12px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===totalPages ? 'not-allowed' : 'pointer', opacity: page===totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'bulk' && <BulkUploadModal onClose={() => setModal(null)} onSave={() => { setModal(null); fetchClients(); }} />}
      {bulkModal && <BulkUploadModal onClose={() => setBulkModal(false)} onSave={() => { setBulkModal(false); fetchClients(); }} />}
      {onboardingClient && (
        <ClientModal client={onboardingClient} isOnboarding onClose={() => setOnboardingClient(null)} onSave={handleOnboardSave} />
      )}
    </div>
  );
}
