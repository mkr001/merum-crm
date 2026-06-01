// src/pages/Compliance.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, AlertCircle, CheckCircle, Clock, Trash2, Search, X, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useResponsive from '../utils/useResponsive';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

// ─── Constants ─────────────────────────────────────────────────
const PRIORITIES  = ['low', 'medium', 'high', 'critical'];
const CATEGORIES  = ['GST', 'ROC', 'FCRA', 'ITR', 'Audit', 'TDS', 'PF', 'ESI', 'Other'];
const PAGE_SIZE   = 50;

const PRIORITY_META = {
  low:      { color: '#3b8bd4', bg: '#e6f1fb', label: 'Low'      },
  medium:   { color: '#ef9f27', bg: '#faeeda', label: 'Medium'   },
  high:     { color: '#e24b4a', bg: '#fcebeb', label: 'High'     },
  critical: { color: '#a32d2d', bg: '#fee2e2', label: 'Critical' },
};

const STATUS_META = {
  pending:     { bg: '#faeeda', color: '#854f0b', label: 'Pending'     },
  in_progress: { bg: '#eeedfe', color: '#534ab7', label: 'In Progress' },
  completed:   { bg: '#eaf3de', color: '#3b6d11', label: 'Completed'   },
  overdue:     { bg: '#fcebeb', color: '#a32d2d', label: 'Overdue'     },
  waived:      { bg: '#f8f7f4', color: '#888',    label: 'Waived'      },
};

// ─── Helpers ───────────────────────────────────────────────────
function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function urgencyStyle(days, status) {
  if (status === 'completed') return { border: '#2d9d78', pill: { bg: '#eaf3de', color: '#3b6d11', label: 'Done' } };
  if (status === 'waived')    return { border: '#ddd',    pill: { bg: '#f8f7f4', color: '#888', label: 'Waived' } };
  if (days < 0)   return { border: '#e24b4a', pill: { bg: '#fcebeb', color: '#a32d2d', label: `${Math.abs(days)}d overdue` } };
  if (days === 0) return { border: '#e24b4a', pill: { bg: '#fcebeb', color: '#a32d2d', label: 'Due today' } };
  if (days <= 3)  return { border: '#ef9f27', pill: { bg: '#fff3e0', color: '#e65100', label: `${days}d left` } };
  if (days <= 7)  return { border: '#ef9f27', pill: { bg: '#faeeda', color: '#854f0b', label: `${days}d left` } };
  return { border: '#e8e6e0', pill: { bg: '#f8f7f4', color: '#666', label: `${days}d left` } };
}

function Skeleton({ w = '100%', h = 13, r = 6, mb = 0 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
  );
}

// ─── Compliance Modal ──────────────────────────────────────────
function ComplianceModal({ item, clients, users, onClose, onSave }) {
  const [form, setForm]   = useState(item || { status: 'pending', priority: 'medium', category: 'GST', reminder_days: 7 });
  const [saving, setSaving] = useState(false);
  const [customCat, setCustomCat] = useState(!CATEGORIES.includes(form.category) && form.category !== undefined);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };
  const foc = e => { e.target.style.borderColor = '#2d9d78'; };
  const blr = e => { e.target.style.borderColor = '#e8e5e0'; };

  const handleSave = async () => {
    if (!form.title?.trim())  return toast.error('Title is required');
    if (!form.client_id)      return toast.error('Client is required');
    if (!form.due_date)       return toast.error('Due date is required');
    setSaving(true);
    try {
      const { data } = form.id
        ? await api.patch(`/compliance/${form.id}`, form)
        : await api.post('/compliance', form);
      onSave(data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 540, maxHeight: '92vh', overflowY: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Compliance Item' : 'New Compliance Item'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Title *</label>
            <input style={inp} value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. GST GSTR-3B Return — June 2025" onFocus={foc} onBlur={blr} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Client *</label>
            <select style={inp} value={form.client_id || ''} onChange={e => set('client_id', e.target.value)} onFocus={foc} onBlur={blr}>
              <option value="">Select a client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Category</label>
            <select style={inp} value={customCat ? 'Other' : (form.category || 'GST')}
              onChange={e => { if (e.target.value === 'Other') { setCustomCat(true); set('category', ''); } else { setCustomCat(false); set('category', e.target.value); } }}
              onFocus={foc} onBlur={blr}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {customCat && (
              <input style={{ ...inp, marginTop: 8 }} value={form.category || ''} onChange={e => set('category', e.target.value)} placeholder="Specify category…" autoFocus onFocus={foc} onBlur={blr} />
            )}
          </div>
          <div>
            <label style={lbl}>Priority</label>
            <select style={inp} value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)} onFocus={foc} onBlur={blr}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Due Date *</label>
            <input type="date" style={inp} value={form.due_date ? form.due_date.slice(0,10) : ''} onChange={e => set('due_date', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Reminder (days before)</label>
            <input type="number" min="1" max="30" style={inp} value={form.reminder_days || 7} onChange={e => set('reminder_days', parseInt(e.target.value) || 7)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Assigned To</label>
            <select style={inp} value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value || null)} onFocus={foc} onBlur={blr}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status || 'pending'} onChange={e => set('status', e.target.value)} onFocus={foc} onBlur={blr}>
              {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid #f0ede8' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 24px', background: saving ? '#ccc' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function Compliance() {
  const { user }  = useAuth();
  const isClient  = user?.role === 'client';
  const { isMobile } = useResponsive();

  const [items, setItems]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [clients, setClients]     = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch]       = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [modal, setModal]         = useState(null);
  const [page, setPage]           = useState(1);

  const fetchData = useCallback(async (status = filterStatus, pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (status) params.status = status;
      if (isClient) {
        const { data } = await api.get('/compliance', { params });
        setItems(data.data || []); setTotal(data.total || 0);
      } else {
        const [compRes, clientsRes, usersRes] = await Promise.all([
          api.get('/compliance', { params }),
          api.get('/clients?limit=500'),
          api.get('/users'),
        ]);
        setItems(compRes.data.data || []); setTotal(compRes.data.total || 0);
        setClients(clientsRes.data.data || []);
        setUsers(usersRes.data.data || []);
      }
      setSelectedIds([]);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load compliance data');
    } finally { setLoading(false); }
  }, [filterStatus, page, isClient]);

  useEffect(() => { if (user) { setPage(1); fetchData(filterStatus, 1); } }, [filterStatus, user]);
  useEffect(() => { if (page > 1) fetchData(filterStatus, page); }, [page]);

  const markDone = async (item) => {
    try {
      await api.patch(`/compliance/${item.id}`, { status: 'completed' });
      toast.success('Marked as completed!');
      fetchData(filterStatus, page);
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this compliance item?')) return;
    try {
      await api.delete(`/compliance/${id}`);
      toast.success('Deleted');
      fetchData(filterStatus, page);
    } catch (err) { toast.error(err?.response?.data?.error || 'Delete failed'); }
  };

  const handleBulkMark = async (status) => {
    if (!window.confirm(`Mark ${selectedIds.length} items as "${status.replace('_',' ')}"?`)) return;
    try {
      await api.post('/compliance/bulk-update', { ids: selectedIds, updates: { status } });
      toast.success(`${selectedIds.length} items updated`);
      setSelectedIds([]);
      fetchData(filterStatus, page);
    } catch (err) { toast.error('Bulk update failed'); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} items?`)) return;
    try {
      await api.post('/compliance/bulk-delete', { ids: selectedIds });
      toast.success(`${selectedIds.length} items deleted`);
      setSelectedIds([]);
      fetchData(filterStatus, page);
    } catch (err) { toast.error('Bulk delete failed'); }
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('No items to export');
    const rows = filtered.map(i => ({
      'Title': i.title, 'Client': i.clients?.org_name || '', 'Category': i.category || '',
      'Priority': i.priority, 'Status': i.status, 'Due Date': i.due_date,
      'Assigned To': i.users?.full_name || '', 'Days Left': daysUntil(i.due_date),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compliance');
    XLSX.writeFile(wb, `compliance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Client-side filters on current page
  const filtered = useMemo(() => {
    let list = items;
    if (filterPriority) list = list.filter(i => i.priority === filterPriority);
    if (filterCategory) list = list.filter(i => i.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q) ||
        (i.clients?.org_name || '').toLowerCase().includes(q) ||
        (i.users?.full_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filterPriority, filterCategory, search]);

  // Summary counts from current full page
  const counts = useMemo(() => ({
    overdue:     items.filter(i => daysUntil(i.due_date) < 0 && i.status !== 'completed' && i.status !== 'waived').length,
    dueThisWeek: items.filter(i => { const d = daysUntil(i.due_date); return d >= 0 && d <= 7 && i.status !== 'completed'; }).length,
    completed:   items.filter(i => i.status === 'completed').length,
    total:       total,
  }), [items, total]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'pending',     label: 'Pending'     },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'overdue',     label: 'Overdue'     },
    { value: 'completed',   label: 'Completed'   },
    { value: 'waived',      label: 'Waived'      },
  ];

  return (
    <div>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .comp-row:hover { background: #faf9f7 !important; }
        .comp-row td:first-child { transition: border-left-color .15s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>
            {isClient ? 'My Compliances' : 'Compliance Calendar'}
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>
            {total.toLocaleString()} total items · page {page} of {totalPages || 1}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isClient && selectedIds.length > 0 && (
            <>
              <button onClick={() => handleBulkMark('completed')}
                style={{ padding: '8px 14px', background: '#eaf3de', color: '#3b6d11', border: '1px solid #cce8af', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={14} /> Mark Filed ({selectedIds.length})
              </button>
              <button onClick={() => handleBulkMark('in_progress')}
                style={{ padding: '8px 14px', background: '#eeedfe', color: '#534ab7', border: '1px solid #d4d1f9', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                In Progress
              </button>
              <button onClick={handleBulkDelete}
                style={{ padding: '8px 14px', background: '#fcebeb', color: '#a32d2d', border: '1px solid #f5c6c6', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={14} /> Delete ({selectedIds.length})
              </button>
            </>
          )}
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
          {!isClient && (
            <button onClick={() => setModal('new')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={16} /> New Compliance
            </button>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 20 }}>
        {[
          { icon: Clock,        label: 'Total Items',    value: counts.total,       color: '#534ab7', bg: '#eeedfe' },
          { icon: AlertCircle,  label: 'Overdue',        value: counts.overdue,     color: '#a32d2d', bg: '#fcebeb' },
          { icon: Clock,        label: 'Due This Week',  value: counts.dueThisWeek, color: '#854f0b', bg: '#faeeda' },
          { icon: CheckCircle,  label: 'Completed',      value: counts.completed,   color: '#3b6d11', bg: '#eaf3de' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#888', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, client, assignee…"
            style={{ width: '100%', padding: '9px 34px 9px 34px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}><X size={14} /></button>}
        </div>

        {/* Priority */}
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
        </select>

        {/* Category */}
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Status tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(({ value, label }) => {
          const active = filterStatus === value;
          const m = value ? STATUS_META[value] : null;
          return (
            <button key={value} onClick={() => { setFilterStatus(value); setPage(1); }}
              style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${active ? (m?.color || '#2d9d78') : '#e8e5e0'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                background: active ? (m?.bg || '#eaf3de') : '#fff',
                color: active ? (m?.color || '#3b6d11') : '#666', transition: 'all .15s' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#a32d2d', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ⚠️ {error}
          <button onClick={() => fetchData()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a32d2d', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 13, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              {!isClient && (
                <th style={{ padding: '11px 14px', width: 40 }}>
                  <input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={e => setSelectedIds(e.target.checked ? filtered.map(i => i.id) : [])}
                    style={{ accentColor: '#2d9d78' }} />
                </th>
              )}
              {[
                'Compliance Item',
                ...(!isClient ? ['Client'] : []),
                'Due Date',
                'Priority',
                ...(!isClient ? ['Assigned To'] : []),
                'Status',
                ...(!isClient ? ['Action'] : []),
              ].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  {!isClient && <td style={{ padding: '14px' }}><Skeleton w={16} h={16} r={4} /></td>}
                  <td style={{ padding: '14px' }}><Skeleton w="70%" h={14} mb={6} /><Skeleton w="30%" h={10} /></td>
                  {!isClient && <td style={{ padding: '14px' }}><Skeleton w="60%" h={13} /></td>}
                  <td style={{ padding: '14px' }}><Skeleton w="80%" h={13} mb={5} /><Skeleton w="50%" h={10} /></td>
                  <td style={{ padding: '14px' }}><Skeleton w={60} h={22} r={11} /></td>
                  {!isClient && <td style={{ padding: '14px' }}><Skeleton w="60%" h={13} /></td>}
                  <td style={{ padding: '14px' }}><Skeleton w={75} h={22} r={11} /></td>
                  {!isClient && <td style={{ padding: '14px' }}><Skeleton w={90} h={28} r={7} /></td>}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isClient ? 4 : 8} style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
                <CheckCircle size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No compliance items found</div>
                <div style={{ fontSize: 13 }}>{search || filterPriority || filterCategory ? 'Try adjusting your filters' : 'Add your first compliance item'}</div>
              </td></tr>
            ) : filtered.map(item => {
              const days = daysUntil(item.due_date);
              const u    = urgencyStyle(days, item.status);
              const pm   = PRIORITY_META[item.priority] || PRIORITY_META.medium;
              const sm   = STATUS_META[item.status]   || STATUS_META.pending;
              return (
                <tr key={item.id} className="comp-row" style={{ borderBottom: '1px solid #f0ede8', borderLeft: `3.5px solid ${u.border}` }}>
                  {!isClient && (
                    <td style={{ padding: '13px 14px' }}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)}
                        onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(x => x !== item.id))}
                        style={{ accentColor: '#2d9d78' }} />
                    </td>
                  )}
                  <td style={{ padding: '13px 14px', maxWidth: 220 }}>
                    <div style={{ fontWeight: 600, color: '#1a1a18', marginBottom: 2 }}>{item.title}</div>
                    {item.category && (
                      <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 8, background: '#f0ede8', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>
                        {item.category}
                      </span>
                    )}
                  </td>
                  {!isClient && (
                    <td style={{ padding: '13px 14px', color: '#555', fontSize: 13 }}>
                      {item.clients?.org_name || '—'}
                    </td>
                  )}
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ fontSize: 13, color: '#333', marginBottom: 4 }}>
                      {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: u.pill.bg, color: u.pill.color, fontWeight: 700 }}>
                      {u.pill.label}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: pm.bg, color: pm.color, fontWeight: 700, textTransform: 'capitalize' }}>
                      {pm.label}
                    </span>
                  </td>
                  {!isClient && (
                    <td style={{ padding: '13px 14px', fontSize: 12.5, color: '#555' }}>
                      {item.users?.full_name
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#C70073' + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#C70073' }}>
                              {item.users.full_name.charAt(0).toUpperCase()}
                            </div>
                            {item.users.full_name.split(' ')[0]}
                          </div>
                        : <span style={{ color: '#bbb' }}>Unassigned</span>
                      }
                    </td>
                  )}
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sm.bg, color: sm.color, fontWeight: 700 }}>
                      {sm.label}
                    </span>
                  </td>
                  {!isClient && (
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => setModal(item)}
                          style={{ padding: '5px 11px', border: '1px solid #e8e5e0', borderRadius: 7, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#555' }}>
                          Edit
                        </button>
                        {!['completed','waived'].includes(item.status) && (
                          <button onClick={() => markDone(item)}
                            style={{ padding: '5px 11px', border: '1px solid #2d9d78', borderRadius: 7, background: '#fff', color: '#2d9d78', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            ✓ Filed
                          </button>
                        )}
                        <button onClick={() => handleDelete(item.id)}
                          style={{ padding: '5px 8px', border: '1px solid #f5c6c6', borderRadius: 7, background: '#fcebeb', color: '#a32d2d', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
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
            Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,total)} of {total.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ padding: '7px 12px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===1 ? 'not-allowed' : 'pointer', opacity: page===1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ padding: '7px 14px', background: '#1a1a18', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding: '7px 12px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===totalPages ? 'not-allowed' : 'pointer', opacity: page===totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <ComplianceModal
          item={modal === 'new' ? null : modal}
          clients={clients} users={users}
          onClose={() => setModal(null)}
          onSave={() => { toast.success('Saved!'); setModal(null); fetchData(filterStatus, page); }}
        />
      )}
    </div>
  );
}
