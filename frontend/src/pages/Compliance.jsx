// src/pages/Compliance.jsx
import { useEffect, useState } from 'react';
import { Plus, AlertCircle, CheckCircle, Clock, Trash2, Search } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useResponsive from '../utils/useResponsive';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLOR = { low: '#3b8bd4', medium: '#ef9f27', high: '#e24b4a', critical: '#a32d2d' };
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = ['GST', 'ROC', 'FCRA', 'ITR', 'Audit', 'Other'];
const STATUS_STYLE = {
  pending:     { bg: '#faeeda', color: '#854f0b' },
  in_progress: { bg: '#eeedfe', color: '#534ab7' },
  completed:   { bg: '#eaf3de', color: '#3b6d11' },
  overdue:     { bg: '#fcebeb', color: '#a32d2d' },
  waived:      { bg: '#f8f7f4', color: '#888' },
};

function ComplianceModal({ item, clients, users, onClose, onSave }) {
  const [form, setForm] = useState(item || { status: 'pending', priority: 'medium', category: 'GST', reminder_days: 7 });
  const [saving, setSaving] = useState(false);
  const isCustomCategory = form.category && !CATEGORIES.includes(form.category) || form.category === 'Other';
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (!form.title) return toast.error('Title is required');
    if (!form.client_id) return toast.error('Client is required');
    if (!form.due_date) return toast.error('Due date is required');
    setSaving(true);
    try {
      const { data } = form.id
        ? await api.patch(`/compliance/${form.id}`, form)
        : await api.post('/compliance', form);
      onSave(data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
      <div className="res-modal" style={{ background: '#fff', borderRadius: 16, width: 500, padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Compliance Item' : 'New Compliance Item'}</h2>
        <div className="res-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="E.g. GST GSTR-3B Return" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Client *</label>
            <select style={inputStyle} value={form.client_id || ''} onChange={e => set('client_id', e.target.value)}>
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={isCustomCategory ? 'Other' : (form.category || 'GST')} onChange={e => set('category', e.target.value === 'Other' ? 'Other' : e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {isCustomCategory && (
              <input style={{...inputStyle, marginTop: 8}} value={form.category === 'Other' ? '' : form.category} onChange={e => set('category', e.target.value)} placeholder="Specify custom category..." autoFocus />
            )}
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Due Date *</label>
            <input type="date" style={inputStyle} value={form.due_date ? form.due_date.slice(0, 10) : ''} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Reminder Days</label>
            <input type="number" style={inputStyle} value={form.reminder_days || 7} onChange={e => set('reminder_days', parseInt(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>Assigned To</label>
            <select style={inputStyle} value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">Select user...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'pending'} onChange={e => set('status', e.target.value)}>
              {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Compliance() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const { isMobile } = useResponsive();

  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      if (isClient) {
        const { data } = await api.get('/compliance', { params });
        setItems(data.data || []);
      } else {
        const [{ data }, { data: clientsData }, { data: usersData }] = await Promise.all([
          api.get('/compliance', { params }),
          api.get('/clients'),
          api.get('/users')
        ]);
        setItems(data.data || []);
        setClients(clientsData.data || []);
        setUsers(usersData.data || []);
      }
    } catch (e) {
      toast.error('Failed to load compliance calendar');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (user) {
      fetch();
    }
  }, [filterStatus, user]);

  const markDone = async (item) => {
    await api.patch(`/compliance/${item.id}`, { status: 'completed' });
    toast.success('Marked as completed!');
    fetch();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this compliance item?')) return;
    try {
      await api.delete(`/compliance/${id}`);
      toast.success('Deleted successfully');
      setSelectedIds(prev => prev.filter(x => x !== id));
      fetch();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} items?`)) return;
    try {
      await api.post('/compliance/bulk-delete', { ids: selectedIds });
      toast.success('Items deleted');
      setSelectedIds([]);
      fetch();
    } catch (e) {
      toast.error('Failed to delete items');
    }
  };

  const handleBulkStatus = async (status) => {
    try {
      await api.post('/compliance/bulk-update', { ids: selectedIds, updates: { status } });
      toast.success(`Items moved to ${status.replace('_', ' ')}`);
      setSelectedIds([]);
      fetch();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const daysUntil = (date) => {
    const d = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return d;
  };

  const filtered = items.filter(item => 
    !search || 
    item.title?.toLowerCase().includes(search.toLowerCase()) || 
    item.category?.toLowerCase().includes(search.toLowerCase()) ||
    (!isClient && (
      item.clients?.org_name?.toLowerCase().includes(search.toLowerCase()) || 
      item.users?.full_name?.toLowerCase().includes(search.toLowerCase())
    ))
  );

  return (
    <div>
      <div className="res-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>
            {isClient ? 'My Compliances' : 'Compliance Calendar'}
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>
            {isClient ? 'Track your active and upcoming compliance filings' : 'Track all client compliance deadlines'}
          </p>
        </div>
        {!isClient && (
          <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> New Compliance
          </button>
        )}
      </div>

      {/* Status filter tabs & Bulk Actions */}
      <div className="res-filters" style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 350 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isClient ? "Search title or category..." : "Search title, client, assignee..."}
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div className="res-tabs-scroll" style={{ display: 'flex', gap: 6 }}>
        {['', 'pending', 'in_progress', 'completed', 'overdue'].map((s, i) => (
          <button key={i} onClick={() => setFilterStatus(s)}
            style={{ padding: '7px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              borderColor: filterStatus === s ? '#2d9d78' : '#ddd',
              background: filterStatus === s ? '#e1f5ee' : '#fff',
              color: filterStatus === s ? '#0f6e56' : '#666'
            }}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        </div>
        {!isClient && selectedIds.length > 0 && (
          <div className="res-btn-row" style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button onClick={() => handleBulkStatus('pending')} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #ddd', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Set Pending</button>
            <button onClick={() => handleBulkStatus('in_progress')} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #ddd', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Set In Progress</button>
            <button onClick={() => handleBulkStatus('completed')} style={{ padding: '7px 14px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Set Completed</button>
            <button onClick={handleBulkDelete} style={{ padding: '7px 14px', background: '#e24b4a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
              Delete ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="res-table-container" style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              {!isClient && (
                <th style={{ padding: '11px 14px', width: 40 }}>
                  <input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length} onChange={e => setSelectedIds(e.target.checked ? filtered.map(i => i.id) : [])} />
                </th>
              )}
              {(isClient 
                ? ['Title', 'Due Date', 'Priority', 'Assigned To', 'Status']
                : ['Title', 'Client', 'Due Date', 'Priority', 'Assigned To', 'Status', 'Action']
              ).map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isClient ? 5 : 8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isClient ? 5 : 8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No compliance items found</td></tr>
            ) : filtered.map(item => {
              const days = daysUntil(item.due_date);
              const s = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  {!isClient && (
                    <td style={{ padding: '12px 14px', width: 40 }}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={e => {
                        if (e.target.checked) setSelectedIds(prev => [...prev, item.id]);
                        else setSelectedIds(prev => prev.filter(id => id !== item.id));
                      }} />
                    </td>
                  )}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 500, color: '#1a1a18' }}>{item.title}</div>
                    {item.category && <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', marginTop: 2 }}>{item.category}</div>}
                  </td>
                  {!isClient && <td style={{ padding: '12px 14px', color: '#555' }}>{item.clients?.org_name || '—'}</td>}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ color: days < 0 ? '#e24b4a' : days <= 7 ? '#ef9f27' : '#555' }}>
                      {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: days < 0 ? '#e24b4a' : '#aaa' }}>
                      {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Today' : `${days} days left`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: PRIORITY_COLOR[item.priority] + '20', color: PRIORITY_COLOR[item.priority], textTransform: 'capitalize', fontWeight: 500 }}>
                      {item.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ color: '#555', fontSize: 12 }}>
                      {item.users?.full_name || 'Unassigned'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 500, textTransform: 'capitalize' }}>
                      {item.status?.replace('_', ' ')}
                    </span>
                  </td>
                  {!isClient && (
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => setModal(item)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                        {item.status !== 'completed' && item.status !== 'waived' && (
                          <button onClick={() => markDone(item)} style={{ padding: '5px 12px', border: '1px solid #2d9d78', borderRadius: 6, background: '#fff', color: '#2d9d78', fontSize: 12, cursor: 'pointer' }}>
                            Mark Done
                          </button>
                        )}
                        <button onClick={() => handleDelete(item.id)} style={{
                          padding: '5px', border: '1px solid #e24b4a', borderRadius: 6, background: '#fff', color: '#e24b4a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }} title="Delete">
                          <Trash2 size={14} />
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

      {modal && (
        <ComplianceModal
          item={modal === 'new' ? null : modal}
          clients={clients}
          users={users}
          onClose={() => setModal(null)}
          onSave={() => { toast.success('Saved!'); fetch(); }}
        />
      )}
    </div>
  );
}
