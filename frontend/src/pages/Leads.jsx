// src/pages/Leads.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus, Search, Trash2, Upload, Download, Phone, Mail,
  ChevronLeft, ChevronRight, ArrowRight, X, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import useResponsive from '../utils/useResponsive';

// ─── Constants ────────────────────────────────────────────────
const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];

const STATUS_META = {
  new:           { bg: '#e6f1fb', color: '#185fa5', label: 'New'           },
  contacted:     { bg: '#faeeda', color: '#854f0b', label: 'Contacted'     },
  qualified:     { bg: '#eaf3de', color: '#3b6d11', label: 'Qualified'     },
  proposal_sent: { bg: '#eeedfe', color: '#534ab7', label: 'Proposal Sent' },
  converted:     { bg: '#e1f5ee', color: '#0f6e56', label: 'Converted'     },
  lost:          { bg: '#fcebeb', color: '#a32d2d', label: 'Lost'          },
};

const SOURCE_META = {
  Website:  { bg: '#e6f1fb', color: '#185fa5' },
  Referral: { bg: '#eaf3de', color: '#3b6d11' },
  Partner:  { bg: '#eeedfe', color: '#534ab7' },
  LinkedIn: { bg: '#e1f0fb', color: '#0077b5' },
  Event:    { bg: '#faeeda', color: '#854f0b' },
  'Cold Call': { bg: '#fcebeb', color: '#a32d2d' },
};

const ORG_TYPES   = ['NGO', 'FPO', 'Research', 'Community', 'Social Enterprise', 'Other'];
const SOURCES     = ['Website', 'Referral', 'Partner', 'LinkedIn', 'Event', 'Cold Call'];
const LOST_REASONS = ['Budget constraints', 'Went with competitor', 'Not interested', 'No response', 'Project cancelled', 'Other'];
const PAGE_SIZE   = 50;

// ─── Helpers ──────────────────────────────────────────────────
function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || { bg: '#eee', color: '#555', label: status };
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

function SourcePill({ source }) {
  const m = SOURCE_META[source] || { bg: '#f8f7f4', color: '#666' };
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 10.5, padding: '2px 8px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {source || '—'}
    </span>
  );
}

function Skeleton({ w = '100%', h = 14, r = 6, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: mb,
    }} />
  );
}

// ─── Lead Modal ───────────────────────────────────────────────
function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm]       = useState(lead || { status: 'new', org_type: 'NGO', source: 'Website', interest_services: [] });
  const [saving, setSaving]   = useState(false);
  const [services, setServices] = useState([]);
  const [lostReason, setLostReason] = useState(() => {
    if (!lead?.notes) return '';
    const m = lead.notes.match(/^Lost reason: (.+?)(\n|$)/);
    return m ? m[1] : '';
  });

  useEffect(() => {
    api.get('/services').then(r => setServices(r.data.data || [])).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (name) => {
    const cur = form.interest_services || [];
    set('interest_services', cur.includes(name) ? cur.filter(s => s !== name) : [...cur, name]);
  };

  const handleSave = async () => {
    if (!form.org_name?.trim()) return toast.error('Organization name is required');
    setSaving(true);
    try {
      const payload = { ...form };
      // Prepend lost reason to notes if applicable
      if (form.status === 'lost' && lostReason) {
        const cleanNotes = (form.notes || '').replace(/^Lost reason: .+?\n?/, '');
        payload.notes = `Lost reason: ${lostReason}\n${cleanNotes}`.trim();
      }
      if (form.id) {
        const { data } = await api.patch(`/leads/${form.id}`, payload);
        onSave(data, 'updated');
      } else {
        const { data } = await api.post('/leads', payload);
        onSave(data, 'created');
      }
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save lead');
    } finally { setSaving(false); }
  };

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };
  const focus = e => { e.target.style.borderColor = '#2d9d78'; };
  const blur  = e => { e.target.style.borderColor = '#e8e5e0'; };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 580, maxHeight: '92vh', overflowY: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4, display: 'flex' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Organization Name *</label>
            <input style={inp} value={form.org_name || ''} onChange={e => set('org_name', e.target.value)} placeholder="e.g. Gram Vikas Foundation" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={lbl}>Contact Person</label>
            <input style={inp} value={form.contact_person || ''} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input style={inp} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contact@org.com" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={lbl}>Org Type</label>
            <select style={inp} value={form.org_type || 'NGO'} onChange={e => set('org_type', e.target.value)} onFocus={focus} onBlur={blur}>
              {ORG_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Source</label>
            <select style={inp} value={form.source || 'Website'} onChange={e => set('source', e.target.value)} onFocus={focus} onBlur={blur}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status || 'new'} onChange={e => set('status', e.target.value)} onFocus={focus} onBlur={blur}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Expected Value (₹)</label>
            <input style={inp} type="number" min="0" value={form.expected_value || ''} onChange={e => set('expected_value', e.target.value)} placeholder="50000" onFocus={focus} onBlur={blur} />
          </div>

          {/* Lost reason — shown only when status = lost */}
          {form.status === 'lost' && (
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Lost Reason</label>
              <select style={inp} value={lostReason} onChange={e => setLostReason(e.target.value)} onFocus={focus} onBlur={blur}>
                <option value="">Select reason…</option>
                {LOST_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}

          {/* Interest services */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Interest Services</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#faf9f7', padding: 14, borderRadius: 9, border: '1px solid #f0ede8' }}>
              {services.length === 0
                ? <span style={{ fontSize: 11, color: '#aaa' }}>Loading services…</span>
                : services.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={(form.interest_services || []).includes(s.name)} onChange={() => toggleService(s.name)} style={{ accentColor: '#2d9d78' }} />
                    {s.name}
                  </label>
                ))
              }
            </div>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Any relevant details…" onFocus={focus} onBlur={blur} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid #f0ede8' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 22px', background: saving ? '#ccc' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : form.id ? 'Update Lead' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Upload Modal ────────────────────────────────────────
function BulkUploadModal({ onClose, onSave }) {
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults]   = useState(null);

  const downloadTemplate = () => {
    const headers = ['Organization Name','Contact Person','Email','Phone','Org Type','Source','Status','Expected Value'];
    const sample  = ['Gram Vikas Foundation','Aarav Kumar','contact@gramvikas.org','9876543210','NGO','Referral','new','50000'];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    ws['!cols'] = [22,18,24,14,16,12,12,14].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'leads_bulk_template.xlsx');
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file');
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!rows.length) return toast.error('File is empty');
      const payload = rows.map(r => ({
        org_name:       r['Organization Name'] || '',
        contact_person: r['Contact Person']    || '',
        email:          r['Email']             || '',
        phone:          String(r['Phone'] || ''),
        org_type:       r['Org Type']          || 'Other',
        source:         r['Source']            || 'Website',
        status:         STATUSES.includes(r['Status']) ? r['Status'] : 'new',
        expected_value: r['Expected Value']    || null,
      }));
      const res = await api.post('/leads/bulk', { leads: payload });
      setResults(res.data);
      if (res.data.successCount > 0) { toast.success(`${res.data.successCount} leads uploaded`); onSave(); }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 520, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Bulk Upload Leads</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
        </div>

        {!results ? (
          <>
            <div style={{ background: '#f8f7f4', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Expected columns:</span>
                <button onClick={downloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={12} /> Download Template
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Organization Name','Contact Person','Email','Phone','Org Type','Source','Status','Expected Value'].map(c => (
                  <span key={c} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#fff', border: '1px solid #e8e5e0', color: '#555' }}>{c}</span>
                ))}
              </div>
            </div>
            <div style={{ border: '2px dashed #e0ddd8', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 20, cursor: 'pointer' }}
              onClick={() => document.getElementById('lead-file-input').click()}>
              <Upload size={28} color="#aaa" style={{ display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, color: '#888' }}>{file ? file.name : 'Click to select .xlsx or .csv file'}</div>
              <input id="lead-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !file}
                style={{ padding: '9px 22px', background: uploading || !file ? '#ccc' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: uploading || !file ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploading ? 'Uploading…' : <><Upload size={14} /> Upload & Save</>}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Upload Complete!</h3>
            <p style={{ color: '#555', fontSize: 14 }}>Successfully imported <b>{results.successCount}</b> leads.</p>
            {results.failedRecords?.length > 0 && (
              <p style={{ color: '#e24b4a', fontSize: 13 }}>{results.failedRecords.length} rows failed — check org name column.</p>
            )}
            <button onClick={onClose} style={{ marginTop: 20, padding: '9px 28px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Leads() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [leads, setLeads]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [bulkModal, setBulkModal]   = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pipelineCounts, setPipelineCounts] = useState({});

  // ── Fetch leads (server-side filter + pagination) ──
  const fetchLeads = useCallback(async (pg = page, status = filterStatus) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/leads', { params: { status: status || undefined, page: pg, limit: PAGE_SIZE } });
      setLeads(data.data || []);
      setTotal(data.total || 0);
      setSelectedIds([]);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load leads');
    } finally { setLoading(false); }
  }, [page, filterStatus]);

  // ── Fetch pipeline counts (for summary cards) ──
  const fetchPipeline = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/pipeline');
      const map = {};
      data.forEach(p => { map[p.status] = p.count; });
      setPipelineCounts(map);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchLeads(1, filterStatus); setPage(1); }, [filterStatus]);
  useEffect(() => { if (page > 1) fetchLeads(page, filterStatus); }, [page]);
  useEffect(() => { fetchPipeline(); }, []);

  // ── Client-side search on current page ──
  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      (l.org_name || '').toLowerCase().includes(q) ||
      (l.contact_person || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q)
    );
  }, [leads, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSave = (lead, action) => {
    toast.success(`Lead ${action} successfully`);
    fetchLeads(page, filterStatus);
    fetchPipeline();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads(page, filterStatus);
      fetchPipeline();
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to delete lead'); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected leads?`)) return;
    try {
      await api.post('/leads/bulk-delete', { ids: selectedIds });
      toast.success(`${selectedIds.length} leads deleted`);
      setSelectedIds([]);
      fetchLeads(page, filterStatus);
      fetchPipeline();
    } catch (err) { toast.error(err?.response?.data?.error || 'Bulk delete failed'); }
  };

  const handleBulkStatusChange = async (status) => {
    if (!window.confirm(`Mark ${selectedIds.length} leads as "${status.replace(/_/g,' ')}"?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.patch(`/leads/${id}`, { status })));
      toast.success(`${selectedIds.length} leads updated`);
      setSelectedIds([]);
      fetchLeads(page, filterStatus);
      fetchPipeline();
    } catch (err) { toast.error('Bulk update failed'); }
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('No leads to export');
    const rows = filtered.map(l => ({
      'Organization': l.org_name,
      'Contact':      l.contact_person || '',
      'Email':        l.email || '',
      'Phone':        l.phone || '',
      'Type':         l.org_type || '',
      'Source':       l.source || '',
      'Status':       l.status,
      'Expected (₹)': l.expected_value || '',
      'Added':        l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleAll = () =>
    setSelectedIds(selectedIds.length === filtered.length && filtered.length > 0 ? [] : filtered.map(l => l.id));

  const toggleOne = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Render ──
  return (
    <div>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .lead-row:hover { background: #faf9f7 !important; }
        .lead-row td:first-child { border-left: 3px solid transparent; transition: border-color .15s; }
        .lead-row:hover td:first-child { border-left-color: #2d9d78; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>Leads</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{total.toLocaleString()} total · page {page} of {totalPages || 1}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <>
              <select onChange={e => { if (e.target.value) { handleBulkStatusChange(e.target.value); e.target.value = ''; } }}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                <option value="">Change status…</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <button onClick={handleBulkDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fcebeb', color: '#a32d2d', border: '1px solid #f5c6c6', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={14} /> Delete ({selectedIds.length})
              </button>
            </>
          )}
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
          <button onClick={() => setBulkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Bulk Upload
          </button>
          <button onClick={() => setModal('new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {/* ── Pipeline summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 3 : 6}, 1fr)`, gap: 10, marginBottom: 20 }}>
        {STATUSES.map(s => {
          const m = STATUS_META[s];
          const count = pipelineCounts[s] || 0;
          const active = filterStatus === s;
          return (
            <div key={s} onClick={() => setFilterStatus(active ? '' : s)}
              style={{ background: active ? m.bg : '#fff', border: `1.5px solid ${active ? m.color + '55' : '#e8e6e0'}`, borderRadius: 11, padding: '12px 14px', cursor: 'pointer', transition: 'all .18s',
                boxShadow: active ? `0 4px 12px ${m.color}22` : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: active ? m.color : '#1a1a18' }}>{count}</div>
              <div style={{ fontSize: 10.5, color: active ? m.color : '#888', fontWeight: 600, marginTop: 2 }}>{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Search + status tabs ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…"
            style={{ width: '100%', padding: '9px 36px 9px 34px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status tab strip */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[{ value: '', label: 'All' }, ...STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))].map(({ value, label }) => {
            const active = filterStatus === value;
            const m = value ? STATUS_META[value] : null;
            return (
              <button key={value} onClick={() => { setFilterStatus(value); setPage(1); }}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${active ? (m?.color || '#2d9d78') : '#e8e5e0'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  background: active ? (m?.bg || '#eaf3de') : '#fff',
                  color: active ? (m?.color || '#3b6d11') : '#666',
                  transition: 'all .15s' }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#a32d2d', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ⚠️ {error}
          <button onClick={() => fetchLeads()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a32d2d', fontWeight: 600, fontSize: 13 }}>Retry</button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 13, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              <th style={{ padding: '11px 14px', width: 40 }}>
                <input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length} onChange={toggleAll} style={{ accentColor: '#2d9d78' }} />
              </th>
              {['Organisation', 'Contact', 'Source', 'Status', 'Expected Value', 'Updated', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '14px' }}><Skeleton w={16} h={16} r={4} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w="70%" h={14} mb={6} /><Skeleton w="40%" h={10} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w="60%" h={13} mb={5} /><Skeleton w="50%" h={10} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w={70} h={22} r={11} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w={65} h={22} r={11} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w="50%" h={13} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w="40%" h={13} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w={90} h={28} r={7} /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
                <TrendingUp size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No leads found</div>
                <div style={{ fontSize: 13 }}>{search ? 'Try a different search term' : 'Add your first lead to get started'}</div>
              </td></tr>
            ) : filtered.map(lead => {
              const m = STATUS_META[lead.status] || STATUS_META.new;
              const lostNote = lead.notes?.match(/^Lost reason: (.+?)(\n|$)/)?.[1];
              return (
                <tr key={lead.id} className="lead-row" style={{ borderBottom: '1px solid #f0ede8', cursor: 'pointer' }}
                  onClick={() => setModal(lead)}>
                  <td style={{ padding: '13px 14px' }} onClick={e => { e.stopPropagation(); toggleOne(lead.id); }}>
                    <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => {}} style={{ accentColor: '#2d9d78' }} />
                  </td>
                  <td style={{ padding: '13px 14px', maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, color: '#1a1a18', marginBottom: 2 }}>{lead.org_name}</div>
                    {lead.org_type && <div style={{ fontSize: 11, color: '#aaa' }}>{lead.org_type}</div>}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ color: '#333', fontSize: 13, marginBottom: 3 }}>{lead.contact_person || '—'}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#3b8bd4', textDecoration: 'none' }}>
                          <Phone size={10} />{lead.phone}
                        </a>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#2d9d78', textDecoration: 'none' }}>
                          <Mail size={10} />Email
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <SourcePill source={lead.source} />
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <StatusBadge status={lead.status} />
                    {lead.status === 'lost' && lostNote && (
                      <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 3 }}>{lostNote}</div>
                    )}
                  </td>
                  <td style={{ padding: '13px 14px', color: '#555', fontWeight: 500 }}>
                    {lead.expected_value ? `₹${Number(lead.expected_value).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 11.5, color: '#aaa' }}>{daysAgo(lead.updated_at)}</span>
                  </td>
                  <td style={{ padding: '13px 14px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={e => { e.stopPropagation(); setModal(lead); }}
                        style={{ padding: '5px 11px', border: '1px solid #e8e5e0', borderRadius: 7, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#555' }}>
                        Edit
                      </button>
                      {!['converted','lost'].includes(lead.status) && (
                        <button onClick={e => { e.stopPropagation(); navigate(`/onboarding/new?lead_id=${lead.id}`); }}
                          style={{ padding: '5px 11px', border: '1px solid #2d9d78', borderRadius: 7, background: '#fff', color: '#2d9d78', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                          Convert
                        </button>
                      )}
                      <button onClick={e => handleDelete(lead.id, e)}
                        style={{ padding: '5px 8px', border: '1px solid #f5c6c6', borderRadius: 7, background: '#fcebeb', color: '#a32d2d', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} of {total.toLocaleString()} leads
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              style={{ padding: '7px 11px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: page === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '7px 12px', border: '1px solid', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    borderColor: p === page ? '#2d9d78' : '#e8e5e0',
                    background: p === page ? '#2d9d78' : '#fff',
                    color: p === page ? '#fff' : '#555' }}>
                  {p}
                </button>
              ) : null;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              style={{ padding: '7px 11px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: page === totalPages ? 0.4 : 1 }}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modal && <LeadModal lead={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}
      {bulkModal && <BulkUploadModal onClose={() => setBulkModal(false)} onSave={() => { setBulkModal(false); fetchLeads(1, filterStatus); fetchPipeline(); }} />}
    </div>
  );
}
