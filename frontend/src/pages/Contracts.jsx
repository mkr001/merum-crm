// src/pages/Contracts.jsx — Contract / Proposal Management
import { useEffect, useState } from 'react';
import { Plus, FileSignature, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CONTRACT_TYPES = ['proposal', 'agreement', 'sow', 'nda', 'mou'];
const STATUSES       = ['draft', 'sent', 'negotiation', 'signed', 'expired', 'cancelled'];

const STATUS_COLOR = {
  draft:       { bg: '#f8f7f4', color: '#888' },
  sent:        { bg: '#e6f1fb', color: '#185fa5' },
  negotiation: { bg: '#faeeda', color: '#854f0b' },
  signed:      { bg: '#eaf3de', color: '#3b6d11' },
  expired:     { bg: '#fcebeb', color: '#a32d2d' },
  cancelled:   { bg: '#f8f7f4', color: '#aaa' },
};

function ContractModal({ contract, clients, onClose, onSave }) {
  const [form, setForm] = useState(contract || { status: 'draft', contract_type: 'agreement' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (!form.title?.trim()) return toast.error('Title is required');
    if (!form.client_id) return toast.error('Please select a client');
    setSaving(true);
    try {
      // Only send flat DB columns — strip any joined objects
      const payload = {
        title: form.title, client_id: form.client_id,
        contract_type: form.contract_type, status: form.status,
        value: form.value || null, start_date: form.start_date || null,
        end_date: form.end_date || null, file_url: form.file_url || null,
        notes: form.notes || null,
      };
      if (form.id) {
        await api.patch(`/contracts/${form.id}`, payload);
      } else {
        await api.post('/contracts', payload);
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save contract');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
      <div className="res-modal" style={{ background: '#fff', borderRadius: 16, width: 540, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Contract' : 'New Contract / Proposal'}</h2>
        <div className="res-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Annual Compliance Agreement" />
          </div>
          <div>
            <label style={labelStyle}>Client *</label>
            <select style={inputStyle} value={form.client_id || ''} onChange={e => set('client_id', e.target.value)}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={form.contract_type || 'agreement'} onChange={e => set('contract_type', e.target.value)}>
              {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'draft'} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Value (₹)</label>
            <input type="number" style={inputStyle} value={form.value || ''} onChange={e => set('value', e.target.value)} placeholder="50000" />
          </div>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" style={inputStyle} value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" style={inputStyle} value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>File URL</label>
            <input style={inputStyle} value={form.file_url || ''} onChange={e => set('file_url', e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Contract'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [{ data: cData }, { data: clData }] = await Promise.all([
        api.get('/contracts', { params }),
        api.get('/clients')
      ]);
      setContracts(cData.data || []);
      setClients(clData.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filterStatus]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contract?')) return;
    try {
      await api.delete(`/contracts/${id}`);
      toast.success('Contract deleted');
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete contract');
    }
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  return (
    <div>
      <div className="res-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Contracts & Proposals</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{contracts.length} records</p>
        </div>
        <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> New Contract
        </button>
      </div>

      {/* Status Tabs */}
      <div className="res-tabs-scroll" style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {['', ...STATUSES].map((s, i) => (
          <button key={i} onClick={() => setFilterStatus(s)}
            style={{ padding: '7px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
              borderColor: filterStatus === s ? '#2d9d78' : '#ddd',
              background: filterStatus === s ? '#e1f5ee' : '#fff',
              color: filterStatus === s ? '#0f6e56' : '#666'
            }}>
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="res-table-container" style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              {['Title', 'Client', 'Type', 'Value', 'Status', 'Period', 'File', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '70%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))
            ) : contracts.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}><FileSignature size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />No contracts found</td></tr>
            ) : contracts.map(c => {
              const sc = STATUS_COLOR[c.status] || STATUS_COLOR.draft;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1a1a18' }}>{c.title}</td>
                  <td style={{ padding: '12px 14px', color: '#555' }}>{c.clients?.org_name || '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#666', textTransform: 'uppercase', fontSize: 11, fontWeight: 600 }}>{c.contract_type || '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#1a1a18', fontWeight: 500 }}>{c.value ? fmt(c.value) : '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 500, textTransform: 'capitalize' }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#888', fontSize: 12 }}>
                    {c.start_date ? `${new Date(c.start_date).toLocaleDateString('en-IN')} → ${c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN') : '…'}` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {c.file_url ? <a href={c.file_url} target="_blank" rel="noreferrer" style={{ color: '#3b8bd4' }}><ExternalLink size={14} /></a> : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setModal(c)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(c.id)} style={{ padding: '5px 12px', border: '1px solid #f5c6c6', borderRadius: 6, background: '#fff', color: '#a32d2d', fontSize: 12, cursor: 'pointer' }}>Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <ContractModal
          contract={modal === 'new' ? null : modal}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={() => { toast.success('Contract saved!'); fetchAll(); }}
        />
      )}
    </div>
  );
}
