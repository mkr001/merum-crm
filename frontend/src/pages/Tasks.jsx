// src/pages/Tasks.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus, CheckCircle, Circle, Clock, AlertCircle, Search,
  Trash2, X, Download, ChevronDown, ChevronRight, Filter
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useResponsive from '../utils/useResponsive';
import * as XLSX from 'xlsx';

// ─── Constants ─────────────────────────────────────────────────
const PRIORITIES = ['low', 'medium', 'high'];
const TYPES      = ['follow_up', 'meeting', 'call', 'document', 'review', 'other'];
const STATUSES   = ['open', 'in_progress', 'completed', 'cancelled'];
const PAGE_SIZE  = 60;

const PRIORITY_META = {
  low:    { color: '#3b8bd4', bg: '#e6f1fb', label: 'Low'    },
  medium: { color: '#ef9f27', bg: '#faeeda', label: 'Medium' },
  high:   { color: '#e24b4a', bg: '#fcebeb', label: 'High'   },
};

const TYPE_ICON = {
  follow_up: '📋', meeting: '🤝', call: '📞',
  document: '📄', review: '🔍', other: '✏️',
};

// ─── Helpers ───────────────────────────────────────────────────
function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function isOverdue(task) {
  return task.due_date && new Date(task.due_date) < new Date() && !['completed','cancelled'].includes(task.status);
}

function dueDateLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const days = daysUntil(dateStr);
  const dateStr2 = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const timeStr  = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (days < 0)  return { text: `Overdue by ${Math.abs(days)}d · ${dateStr2}`, color: '#e24b4a' };
  if (days === 0) return { text: `Today · ${timeStr}`, color: '#e24b4a' };
  if (days === 1) return { text: `Tomorrow · ${timeStr}`, color: '#ef9f27' };
  if (days <= 7)  return { text: `${dateStr2} · ${timeStr}`, color: '#ef9f27' };
  return { text: `${dateStr2} · ${timeStr}`, color: '#aaa' };
}

function groupKey(task) {
  if (isOverdue(task)) return 'overdue';
  if (!task.due_date) return 'no_date';
  const d = daysUntil(task.due_date);
  if (d === 0) return 'today';
  if (d <= 7)  return 'this_week';
  return 'later';
}

const GROUP_META = {
  overdue:   { label: 'Overdue',    color: '#a32d2d', bg: '#fcebeb', order: 0 },
  today:     { label: 'Due Today',  color: '#854f0b', bg: '#fff3e0', order: 1 },
  this_week: { label: 'This Week',  color: '#534ab7', bg: '#eeedfe', order: 2 },
  later:     { label: 'Upcoming',   color: '#3b6d11', bg: '#eaf3de', order: 3 },
  no_date:   { label: 'No Due Date', color: '#888',  bg: '#f8f7f4', order: 4 },
};

function Skeleton({ w = '100%', h = 13, r = 6, mb = 0 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
  );
}

// ─── Task Modal ────────────────────────────────────────────────
function TaskModal({ task, users, onClose, onSave }) {
  const [form, setForm]   = useState(task || { status: 'open', priority: 'medium', task_type: 'follow_up' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };
  const foc = e => { e.target.style.borderColor = '#2d9d78'; };
  const blr = e => { e.target.style.borderColor = '#e8e5e0'; };

  const handleSave = async () => {
    if (!form.title?.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.due_date) payload.due_date = null;
      if (!payload.assigned_to) payload.assigned_to = null;
      const { data } = form.id
        ? await api.patch(`/tasks/${form.id}`, payload)
        : await api.post('/tasks', payload);
      onSave(data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 520, maxHeight: '92vh', overflowY: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Title *</label>
            <input style={inp} value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Follow up with Gram Vikas on ITR filing" onFocus={foc} onBlur={blr} autoFocus />
          </div>
          <div>
            <label style={lbl}>Type</label>
            <select style={inp} value={form.task_type || 'follow_up'} onChange={e => set('task_type', e.target.value)} onFocus={foc} onBlur={blr}>
              {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Priority</label>
            <select style={inp} value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)} onFocus={foc} onBlur={blr}>
              {PRIORITIES.map(p => <option key={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Due Date & Time</label>
            <input type="datetime-local" style={inp} value={form.due_date ? form.due_date.slice(0,16) : ''} onChange={e => set('due_date', e.target.value || null)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status || 'open'} onChange={e => set('status', e.target.value)} onFocus={foc} onBlur={blr}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Assigned To</label>
            <select style={inp} value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value || null)} onFocus={foc} onBlur={blr}>
              <option value="">Unassigned (me)</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Additional details…" onFocus={foc} onBlur={blr} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid #f0ede8' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 24px', background: saving ? '#ccc' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : form.id ? 'Update Task' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row ──────────────────────────────────────────────────
function TaskRow({ task, onComplete, onEdit, onDelete, selected, onToggleSelect }) {
  const [hovered, setHovered] = useState(false);
  const overdue = isOverdue(task);
  const done    = task.status === 'completed';
  const cancelled = task.status === 'cancelled';
  const pm  = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const due = dueDateLabel(task.due_date);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? '#faf9f7' : '#fff',
        border: `1.5px solid ${overdue ? '#f7c1c1' : selected ? '#2d9d78' : hovered ? '#d4d1f9' : '#e8e6e0'}`,
        borderLeft: `4px solid ${done ? '#2d9d78' : cancelled ? '#ccc' : overdue ? '#e24b4a' : pm.color}`,
        borderRadius: 11, padding: '13px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
        opacity: cancelled ? 0.6 : 1,
      }}>

      {/* Checkbox */}
      <div onClick={onToggleSelect} style={{ cursor: 'pointer', paddingTop: 1, flexShrink: 0 }}>
        <input type="checkbox" checked={selected} onChange={() => {}} style={{ accentColor: '#2d9d78', width: 15, height: 15 }} />
      </div>

      {/* Complete button */}
      <button onClick={() => !done && !cancelled && onComplete(task)}
        style={{ border: 'none', background: 'none', cursor: done || cancelled ? 'default' : 'pointer', padding: 2, marginTop: 1, flexShrink: 0 }}>
        {done
          ? <CheckCircle size={19} color="#2d9d78" />
          : <Circle size={19} color={hovered && !cancelled ? '#2d9d78' : '#d0ccc8'} style={{ transition: 'color .15s' }} />
        }
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onEdit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: done ? '#aaa' : '#1a1a18', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
            {TYPE_ICON[task.task_type] || '✏️'} {task.title}
          </span>
          <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: pm.bg, color: pm.color, fontWeight: 700, flexShrink: 0 }}>
            {pm.label}
          </span>
          {overdue && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: '#fcebeb', color: '#a32d2d', fontWeight: 700 }}>Overdue</span>}
          {cancelled && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: '#f8f7f4', color: '#888', fontWeight: 700 }}>Cancelled</span>}
        </div>

        {task.notes && (
          <div style={{ fontSize: 12, color: '#888', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 460 }}>
            {task.notes}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {due && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: due.color }}>
              <Clock size={11} /> {due.text}
            </div>
          )}
          {task.users?.full_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#888' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#C70073' + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#C70073' }}>
                {task.users.full_name.charAt(0).toUpperCase()}
              </div>
              {task.users.full_name.split(' ')[0]}
            </div>
          )}
          {task.task_type && task.task_type !== 'other' && (
            <span style={{ fontSize: 11, color: '#bbb', textTransform: 'capitalize' }}>{task.task_type.replace(/_/g,' ')}</span>
          )}
        </div>
      </div>

      {/* Actions — shown on hover */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, opacity: hovered ? 1 : 0, transition: 'opacity .15s' }}>
        <button onClick={onEdit}
          style={{ padding: '5px 11px', border: '1px solid #e8e5e0', borderRadius: 7, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#555' }}>
          Edit
        </button>
        <button onClick={onDelete}
          style={{ padding: '5px 8px', border: '1px solid #f5c6c6', borderRadius: 7, background: '#fcebeb', color: '#a32d2d', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Group Header ──────────────────────────────────────────────
function GroupHeader({ groupKey: key, count, collapsed, onToggle }) {
  const m = GROUP_META[key];
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer', userSelect: 'none', marginTop: 8 }}>
      {collapsed ? <ChevronRight size={14} color="#999" /> : <ChevronDown size={14} color="#999" />}
      <div style={{ height: 2, width: 12, borderRadius: 2, background: m.color }} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: m.color }}>{m.label}</span>
      <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: m.bg, color: m.color, fontWeight: 700 }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: '#f0ede8' }} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function Tasks() {
  const { isMobile } = useResponsive();

  const [tasks, setTasks]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [search, setSearch]         = useState('');
  const [groupByUrgency, setGroupByUrgency] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [modal, setModal]           = useState(null);
  const [page, setPage]             = useState(1);

  const fetchTasks = useCallback(async (status = filterStatus, pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (status) params.status = status;
      const [{ data: tData }, { data: uData }] = await Promise.all([
        api.get('/tasks', { params }),
        api.get('/users'),
      ]);
      setTasks(tData.data || []);
      setTotal(tData.total || 0);
      setUsers(uData.data || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load tasks');
    } finally { setLoading(false); }
  }, [filterStatus, page]);

  useEffect(() => { setPage(1); fetchTasks(filterStatus, 1); }, [filterStatus]);
  useEffect(() => { if (page > 1) fetchTasks(filterStatus, page); }, [page]);

  const markDone = async (task) => {
    try {
      await api.patch(`/tasks/${task.id}`, { status: 'completed', completed_at: new Date().toISOString() });
      toast.success('Task completed!');
      fetchTasks(filterStatus, page);
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to complete task'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted');
      fetchTasks(filterStatus, page);
    } catch (err) { toast.error(err?.response?.data?.error || 'Delete failed'); }
  };

  const handleBulkComplete = async () => {
    if (!window.confirm(`Mark ${selectedIds.length} tasks as completed?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.patch(`/tasks/${id}`, { status: 'completed', completed_at: new Date().toISOString() })));
      toast.success(`${selectedIds.length} tasks completed`);
      setSelectedIds([]);
      fetchTasks(filterStatus, page);
    } catch (err) { toast.error('Bulk update failed'); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} tasks?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/tasks/${id}`)));
      toast.success(`${selectedIds.length} tasks deleted`);
      setSelectedIds([]);
      fetchTasks(filterStatus, page);
    } catch (err) { toast.error('Bulk delete failed'); }
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('No tasks to export');
    const rows = filtered.map(t => ({
      'Title': t.title, 'Type': t.task_type || '', 'Priority': t.priority,
      'Status': t.status, 'Due Date': t.due_date || '',
      'Assigned To': t.users?.full_name || '', 'Notes': t.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, `tasks_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Client-side filters on current page
  const filtered = useMemo(() => {
    let list = tasks;
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    if (filterAssignee) list = list.filter(t => t.assigned_to === filterAssignee || (!t.assigned_to && filterAssignee === 'unassigned'));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.users?.full_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tasks, filterPriority, filterAssignee, search]);

  // Group tasks by urgency
  const grouped = useMemo(() => {
    if (!groupByUrgency || filterStatus === 'completed' || filterStatus === 'cancelled') return null;
    const groups = {};
    filtered.forEach(t => {
      const k = groupKey(t);
      if (!groups[k]) groups[k] = [];
      groups[k].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => GROUP_META[a].order - GROUP_META[b].order);
  }, [filtered, groupByUrgency, filterStatus]);

  const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // Summary counts
  const counts = useMemo(() => ({
    open:        tasks.filter(t => t.status === 'open').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    overdue:     tasks.filter(t => isOverdue(t)).length,
    completed:   tasks.filter(t => t.status === 'completed').length,
  }), [tasks]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const STATUS_TABS = [
    { value: 'open',        label: 'Open'        },
    { value: 'in_progress', label: 'In Progress'  },
    { value: 'completed',   label: 'Completed'   },
    { value: 'cancelled',   label: 'Cancelled'   },
    { value: '',            label: 'All'         },
  ];

  const renderList = (list) => list.map(task => (
    <TaskRow key={task.id} task={task}
      selected={selectedIds.includes(task.id)}
      onToggleSelect={() => setSelectedIds(prev => prev.includes(task.id) ? prev.filter(x => x !== task.id) : [...prev, task.id])}
      onComplete={markDone}
      onEdit={() => setModal(task)}
      onDelete={() => handleDelete(task.id)}
    />
  ));

  return (
    <div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>Tasks</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{total.toLocaleString()} tasks · page {page} of {totalPages || 1}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <>
              <button onClick={handleBulkComplete}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#eaf3de', color: '#3b6d11', border: '1px solid #cce8af', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <CheckCircle size={14} /> Complete ({selectedIds.length})
              </button>
              <button onClick={handleBulkDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fcebeb', color: '#a32d2d', border: '1px solid #f5c6c6', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={14} /> Delete ({selectedIds.length})
              </button>
            </>
          )}
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
          <button onClick={() => setModal('new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Open',        value: counts.open,        color: '#534ab7', bg: '#eeedfe', icon: Circle      },
          { label: 'In Progress', value: counts.in_progress, color: '#854f0b', bg: '#faeeda', icon: Clock       },
          { label: 'Overdue',     value: counts.overdue,     color: '#a32d2d', bg: '#fcebeb', icon: AlertCircle },
          { label: 'Completed',   value: counts.completed,   color: '#3b6d11', bg: '#eaf3de', icon: CheckCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Status tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_TABS.map(({ value, label }) => {
          const active = filterStatus === value;
          return (
            <button key={value} onClick={() => { setFilterStatus(value); setPage(1); }}
              style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${active ? '#2d9d78' : '#e8e5e0'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: active ? '#e1f5ee' : '#fff', color: active ? '#0f6e56' : '#666', transition: 'all .15s' }}>
              {label}
              {value === 'open' && counts.overdue > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#fcebeb', color: '#a32d2d', fontWeight: 700 }}>{counts.overdue} overdue</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search + Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, notes, assignee…"
            style={{ width: '100%', padding: '9px 34px 9px 34px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}><X size={14} /></button>}
        </div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
        </select>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        {/* Group toggle */}
        {!['completed','cancelled'].includes(filterStatus) && (
          <button onClick={() => setGroupByUrgency(g => !g)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1.5px solid ${groupByUrgency ? '#534ab7' : '#e8e5e0'}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: groupByUrgency ? '#eeedfe' : '#fff', color: groupByUrgency ? '#534ab7' : '#666' }}>
            <Filter size={13} /> Group by urgency
          </button>
        )}
      </div>

      {/* ── Select all bar ── */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px', marginBottom: 6 }}>
          <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0}
            onChange={e => setSelectedIds(e.target.checked ? filtered.map(t => t.id) : [])}
            style={{ accentColor: '#2d9d78', width: 15, height: 15 }} />
          <span style={{ fontSize: 12, color: '#888' }}>
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : `Select all (${filtered.length})`}
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#a32d2d', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ⚠️ {error}
          <button onClick={() => fetchTasks()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a32d2d', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* ── Task list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderLeft: '4px solid #f0ede8', borderRadius: 11, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Skeleton w={16} h={16} r={4} />
              <Skeleton w={18} h={18} r={9} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'center' }}>
                  <Skeleton w="50%" h={14} /><Skeleton w={55} h={20} r={10} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Skeleton w={100} h={10} /><Skeleton w={80} h={10} />
                </div>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
            <CheckCircle size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No tasks found</div>
            <div style={{ fontSize: 13 }}>{search || filterPriority ? 'Try adjusting your filters' : `No ${filterStatus || ''} tasks yet`}</div>
          </div>
        ) : grouped ? (
          grouped.map(([key, list]) => (
            <div key={key}>
              <GroupHeader groupKey={key} count={list.length} collapsed={!!collapsedGroups[key]} onToggle={() => toggleGroup(key)} />
              {!collapsedGroups[key] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {renderList(list)}
                </div>
              )}
            </div>
          ))
        ) : (
          renderList(filtered)
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px', marginTop: 8 }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,total)} of {total.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ padding: '7px 14px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===1?'not-allowed':'pointer', opacity: page===1?0.4:1 }}>
              ← Prev
            </button>
            <span style={{ padding: '7px 14px', background: '#1a1a18', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding: '7px 14px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===totalPages?'not-allowed':'pointer', opacity: page===totalPages?0.4:1 }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <TaskModal
          task={modal === 'new' ? null : modal}
          users={users}
          onClose={() => setModal(null)}
          onSave={() => { toast.success('Task saved!'); fetchTasks(filterStatus, page); }}
        />
      )}
    </div>
  );
}
