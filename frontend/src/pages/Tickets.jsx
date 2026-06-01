// src/pages/Tickets.jsx — Support Ticket System
import { useEffect, useState } from 'react';
import { Plus, MessageSquare, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useResponsive from '../utils/useResponsive';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['billing', 'technical', 'compliance', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];

const STATUS_ICON  = { open: Circle, in_progress: Clock, resolved: CheckCircle2, closed: CheckCircle2 };
const STATUS_COLOR = {
  open:        { bg: '#e6f1fb', color: '#185fa5' },
  in_progress: { bg: '#faeeda', color: '#854f0b' },
  resolved:    { bg: '#eaf3de', color: '#3b6d11' },
  closed:      { bg: '#f8f7f4', color: '#888' },
};
const PRIORITY_COLOR = {
  low:    { bg: '#f8f7f4', color: '#888' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  high:   { bg: '#fcebeb', color: '#a32d2d' },
  urgent: { bg: '#f7d0d0', color: '#8b1a1a' },
};

function Circle(props) { return <div style={{ width: props.size, height: props.size, borderRadius: '50%', border: '2px solid currentColor' }} />; }

function TicketModal({ ticket, clients = [], users = [], onClose, onSave }) {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const isReadOnly = isClient && !!ticket;

  const [form, setForm] = useState(ticket || { status: 'open', priority: 'medium', category: 'general' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const inputStyle = { 
    width: '100%', 
    padding: '9px 12px', 
    border: '1px solid #ddd', 
    borderRadius: 8, 
    fontSize: 13, 
    boxSizing: 'border-box', 
    outline: 'none',
    background: isReadOnly ? '#f9f9f9' : '#fff',
    color: isReadOnly ? '#555' : '#1a1a18',
    cursor: isReadOnly ? 'not-allowed' : 'text'
  };
  const selectStyle = {
    ...inputStyle,
    cursor: isReadOnly ? 'not-allowed' : 'pointer'
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (!form.subject) return toast.error('Subject is required');
    if (!isClient && !form.client_id) return toast.error('Please select a client');

    // Only send flat DB columns — strip nested join objects (clients, assignee, raised)
    const payload = {
      subject:          form.subject,
      description:      form.description     || null,
      category:         form.category        || null,
      priority:         form.priority        || null,
      status:           form.status          || 'open',
      client_id:        form.client_id       || null,
      assigned_to:      form.assigned_to     || null,
      resolution_notes: form.resolution_notes || null,
    };

    setSaving(true);
    try {
      if (form.id) {
        await api.patch(`/tickets/${form.id}`, payload);
      } else {
        await api.post('/tickets', payload);
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save ticket');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
      <div className="res-modal" style={{ background: '#fff', borderRadius: 16, width: 540, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
          {isReadOnly ? 'Ticket Details' : form.id ? 'Edit Ticket' : 'New Support Ticket'}
        </h2>
        
        <div className="res-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Subject *</label>
            <input 
              style={inputStyle} 
              disabled={isReadOnly}
              value={form.subject || ''} 
              onChange={e => set('subject', e.target.value)} 
              placeholder="Brief summary of the issue" 
            />
          </div>

          {!isClient && (
            <div>
              <label style={labelStyle}>Client *</label>
              <select style={selectStyle} value={form.client_id || ''} onChange={e => set('client_id', e.target.value)}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Category</label>
            <select 
              style={selectStyle} 
              disabled={isReadOnly}
              value={form.category || 'general'} 
              onChange={e => set('category', e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Priority</label>
            <select 
              style={selectStyle} 
              disabled={isReadOnly}
              value={form.priority || 'medium'} 
              onChange={e => set('priority', e.target.value)}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {(!isClient || isReadOnly) && (
            <div>
              <label style={labelStyle}>Status</label>
              <select 
                style={selectStyle} 
                disabled={isReadOnly}
                value={form.status || 'open'} 
                onChange={e => set('status', e.target.value)}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          )}

          {(!isClient || isReadOnly) && (
            <div>
              <label style={labelStyle}>Assigned To</label>
              {isReadOnly ? (
                <input 
                  style={inputStyle} 
                  disabled 
                  value={ticket?.assignee?.full_name || 'Unassigned'} 
                />
              ) : (
                <select style={selectStyle} value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              )}
            </div>
          )}

          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Description</label>
            <textarea 
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} 
              disabled={isReadOnly}
              value={form.description || ''} 
              onChange={e => set('description', e.target.value)} 
              placeholder="Detailed description of the query or request…" 
            />
          </div>

          {form.id && (!isClient || ticket?.resolution_notes) && (
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Resolution Notes</label>
              <textarea 
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} 
                disabled={isReadOnly}
                value={form.resolution_notes || ''} 
                onChange={e => set('resolution_notes', e.target.value)} 
                placeholder={isReadOnly ? 'No resolution notes provided yet' : 'How was this resolved?'} 
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save Ticket'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Tickets() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('open');
  const [modal, setModal] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      if (isClient) {
        const { data } = await api.get('/tickets', { params });
        setTickets(data.data || []);
      } else {
        const [{ data: tData }, { data: cData }, { data: uData }] = await Promise.all([
          api.get('/tickets', { params }),
          api.get('/clients'),
          api.get('/users')
        ]);
        setTickets(tData.data || []);
        setClients(cData.data || []);
        setUsers(uData.data || []);
      }
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [filterStatus, user]);

  return (
    <div>
      <div className="res-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>
            {isClient ? 'My Support Tickets' : 'Support Tickets'}
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{tickets.length} tickets</p>
        </div>
        <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {isClient && (
        <div style={{ background: '#e1f5ee', border: '1px solid #2d9d78', color: '#0f6e56', padding: '12px 18px', borderRadius: 10, fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} />
          <span>Need assistance? Raise a support ticket and our team will get back to you shortly. You can track the status of your queries below.</span>
        </div>
      )}

      {/* Status Tabs */}
      <div className="res-tabs-scroll" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['open', 'in_progress', 'resolved', 'closed', ''].map((s, i) => (
          <button key={i} onClick={() => setFilterStatus(s)}
            style={{ padding: '7px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', whiteSpace: 'nowrap',
              borderColor: filterStatus === s ? '#2d9d78' : '#ddd',
              background: filterStatus === s ? '#e1f5ee' : '#fff',
              color: filterStatus === s ? '#0f6e56' : '#666'
            }}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="res-table-container" style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              {(isClient 
                ? ['Subject', 'Category', 'Priority', 'Status', 'Assigned To', 'Created', '']
                : ['Subject', 'Client', 'Category', 'Priority', 'Status', 'Assigned To', 'Created', '']
              ).map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  {Array.from({ length: isClient ? 7 : 8 }).map((_, j) => (
                    <td key={j} style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '70%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))
            ) : tickets.length === 0 ? (
              <tr><td colSpan={isClient ? 7 : 8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}><MessageSquare size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />No tickets found</td></tr>
            ) : tickets.map(t => {
              const sc = STATUS_COLOR[t.status] || STATUS_COLOR.open;
              const pc = PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.medium;
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1a1a18', maxWidth: 250 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                  </td>
                  {!isClient && <td style={{ padding: '12px 14px', color: '#555' }}>{t.clients?.org_name || '—'}</td>}
                  <td style={{ padding: '12px 14px', color: '#666', textTransform: 'capitalize' }}>{t.category || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: pc.bg, color: pc.color, fontWeight: 500, textTransform: 'capitalize' }}>{t.priority}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 500, textTransform: 'capitalize' }}>{t.status?.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#555' }}>{t.assignee?.full_name || 'Unassigned'}</td>
                  <td style={{ padding: '12px 14px', color: '#888', fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => setModal(t)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>
                      {isClient ? 'View' : 'Edit'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <TicketModal
          ticket={modal === 'new' ? null : modal}
          clients={clients}
          users={users}
          onClose={() => setModal(null)}
          onSave={() => { toast.success(modal === 'new' ? 'Support ticket raised successfully!' : 'Ticket saved!'); fetchAll(); }}
        />
      )}
    </div>
  );
}

