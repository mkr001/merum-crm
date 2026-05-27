// src/pages/Leads.jsx
import { useEffect, useState } from 'react';
import { Plus, Search, Filter, ChevronRight, Phone, Mail, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];
const STATUS_COLORS = {
  new:           { bg: '#e6f1fb', text: '#185fa5' },
  contacted:     { bg: '#faeeda', text: '#854f0b' },
  qualified:     { bg: '#eaf3de', text: '#3b6d11' },
  proposal_sent: { bg: '#eeedfe', text: '#534ab7' },
  converted:     { bg: '#e1f5ee', text: '#0f6e56' },
  lost:          { bg: '#fcebeb', text: '#a32d2d' },
};

const ORG_TYPES = ['NGO', 'FPO', 'Research', 'Community', 'Social Enterprise', 'Other'];
const SOURCES   = ['Website', 'Referral', 'Partner', 'LinkedIn', 'Event', 'Cold Call'];

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#eee', text: '#555' };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, textTransform: 'capitalize' }}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(lead || { status: 'new', org_type: 'NGO', source: 'Website', interest_services: [] });
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.get('/services').then(r => setServices(r.data.data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (name) => {
    const current = form.interest_services || [];
    if (current.includes(name)) {
      set('interest_services', current.filter(s => s !== name));
    } else {
      set('interest_services', [...current, name]);
    }
  };

  const handleSave = async () => {
    if (!form.org_name) return toast.error('Organization name is required');
    setSaving(true);
    try {
      if (form.id) {
        const { data } = await api.patch(`/leads/${form.id}`, form);
        onSave(data, 'updated');
      } else {
        const { data } = await api.post('/leads', form);
        onSave(data, 'created');
      }
      onClose();
    } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 540, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Lead' : 'Add New Lead'}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Organization Name *</label>
            <input style={inputStyle} value={form.org_name || ''} onChange={e => set('org_name', e.target.value)} placeholder="e.g. Gram Vikas Foundation" />
          </div>
          <div>
            <label style={labelStyle}>Contact Person</label>
            <input style={inputStyle} value={form.contact_person || ''} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contact@org.com" />
          </div>
          <div>
            <label style={labelStyle}>Org Type</label>
            <select style={inputStyle} value={form.org_type || ''} onChange={e => set('org_type', e.target.value)}>
              {ORG_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Source</label>
            <select style={inputStyle} value={form.source || ''} onChange={e => set('source', e.target.value)}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'new'} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Expected Value (₹)</label>
            <input style={inputStyle} type="number" value={form.expected_value || ''} onChange={e => set('expected_value', e.target.value)} placeholder="50000" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Interest Services</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8f7f4', padding: 12, borderRadius: 8 }}>
              {services.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={(form.interest_services || []).includes(s.name)} onChange={() => toggleService(s.name)} />
                  {s.name}
                </label>
              ))}
              {services.length === 0 && <span style={{ fontSize: 11, color: '#aaa' }}>Loading services…</span>}
            </div>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Any relevant details…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | lead object

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/leads', { params });
      setLeads(data.data || []);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, [filterStatus]);

  const handleSave = (lead, action) => {
    toast.success(`Lead ${action} successfully`);
    fetchLeads();
  };

  const handleConvert = async (lead) => {
    if (!window.confirm(`Convert "${lead.org_name}" to a client?`)) return;
    try {
      await api.patch(`/leads/${lead.id}/convert`);
      toast.success('Lead converted to client!');
      fetchLeads();
    } catch {}
  };

  const filtered = leads.filter(l =>
    !search || l.org_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Leads</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{total} total leads</p>
        </div>
        <button onClick={() => setModal('new')} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
          background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9,
          fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              {['Organization', 'Contact', 'Type', 'Source', 'Status', 'Expected Value', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ height: 14, width: '70%', background: '#f5f5f5', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 10, width: '40%', background: '#f5f5f5', borderRadius: 4 }} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ height: 14, width: '60%', background: '#f5f5f5', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 10, width: '50%', background: '#f5f5f5', borderRadius: 4 }} />
                  </td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '60%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '60%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 20, width: '80px', background: '#f5f5f5', borderRadius: 10 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '50%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 26, width: '60px', background: '#f5f5f5', borderRadius: 6 }} /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No leads found</td></tr>
            ) : filtered.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 500, color: '#1a1a18' }}>{lead.org_name}</div>
                  {lead.notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.notes}</div>}
                </td>
                <td style={{ padding: '12px 14px', color: '#555' }}>
                  <div>{lead.contact_person || '—'}</div>
                  {lead.phone && <div style={{ fontSize: 11, color: '#aaa' }}>{lead.phone}</div>}
                </td>
                <td style={{ padding: '12px 14px', color: '#666' }}>{lead.org_type || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#666' }}>{lead.source || '—'}</td>
                <td style={{ padding: '12px 14px' }}><StatusBadge status={lead.status} /></td>
                <td style={{ padding: '12px 14px', color: '#555' }}>
                  {lead.expected_value ? `₹${Number(lead.expected_value).toLocaleString('en-IN')}` : '—'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setModal(lead)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    {lead.status !== 'converted' && lead.status !== 'lost' && (
                      <button onClick={() => handleConvert(lead)} style={{ padding: '5px 12px', border: '1px solid #2d9d78', borderRadius: 6, background: '#fff', color: '#2d9d78', fontSize: 12, cursor: 'pointer' }}>
                        Convert
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'new' || (modal && modal.id)) && (
        <LeadModal
          lead={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
