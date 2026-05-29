// src/pages/Tasks.jsx
import { useEffect, useState } from 'react';
import { Plus, CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useResponsive from '../utils/useResponsive';

const PRIORITIES = ['low', 'medium', 'high'];
const TYPES      = ['follow_up', 'meeting', 'call', 'document', 'review', 'other'];
const PRIORITY_COLOR = { low: '#3b8bd4', medium: '#ef9f27', high: '#e24b4a' };

function TaskModal({ task, users, onClose, onSave }) {
  const [form, setForm] = useState(task || { status: 'open', priority: 'medium', task_type: 'follow_up' });
  const [saving, setSaving] = useState(false);
  const isCustomType = form.task_type && !TYPES.includes(form.task_type) || form.task_type === 'other';
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (!form.title) return toast.error('Title is required');
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
      toast.error(err.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
      <div className="res-modal" style={{ background: '#fff', borderRadius: 16, width: 500, padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Task' : 'New Task'}</h2>
        <div className="res-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Task title" />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={isCustomType ? 'other' : (form.task_type || 'follow_up')} onChange={e => set('task_type', e.target.value === 'other' ? 'other' : e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            {isCustomType && (
              <input style={{...inputStyle, marginTop: 8}} value={form.task_type === 'other' ? '' : form.task_type} onChange={e => set('task_type', e.target.value)} placeholder="Specify custom type..." autoFocus />
            )}
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input type="datetime-local" style={inputStyle} value={form.due_date ? form.due_date.slice(0, 16) : ''} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'open'} onChange={e => set('status', e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Assigned To</label>
            <select style={inputStyle} value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">Default (Me)</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('open');
  const [modal, setModal] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [{ data: tData }, { data: uData }] = await Promise.all([
        api.get('/tasks', { params }),
        api.get('/users')
      ]);
      setTasks(tData.data || []);
      setUsers(uData.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [filterStatus]);

  const markDone = async (task) => {
    await api.patch(`/tasks/${task.id}`, { status: 'completed', completed_at: new Date() });
    toast.success('Task completed!');
    fetchTasks();
  };

  const isOverdue = (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';

  return (
    <div>
      <div className="res-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Tasks</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{tasks.length} tasks</p>
        </div>
        <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Status Tabs */}
      <div className="res-tabs-scroll" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['open', 'in_progress', 'completed', ''].map((s, i) => (
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#f5f5f5', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ height: 14, width: '45%', background: '#f5f5f5', borderRadius: 4 }} />
                  <div style={{ height: 18, width: 50, background: '#f5f5f5', borderRadius: 10 }} />
                </div>
                <div style={{ height: 10, width: '30%', background: '#f5f5f5', borderRadius: 4 }} />
              </div>
              <div style={{ width: 50, height: 26, background: '#f5f5f5', borderRadius: 6, flexShrink: 0 }} />
            </div>
          ))
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
            <CheckCircle size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
            No tasks found
          </div>
        ) : tasks.map(task => (
          <div key={task.id} style={{
            background: '#fff', border: `1px solid ${isOverdue(task) ? '#f7c1c1' : '#e8e6e0'}`,
            borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12
          }}>
            <button onClick={() => task.status !== 'completed' && markDone(task)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, marginTop: 1, flexShrink: 0 }}>
              {task.status === 'completed'
                ? <CheckCircle size={18} color="#2d9d78" />
                : <Circle size={18} color="#ccc" />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 500, fontSize: 14, color: task.status === 'completed' ? '#aaa' : '#1a1a18', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                  {task.title}
                </span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500, textTransform: 'capitalize',
                  background: PRIORITY_COLOR[task.priority] + '20', color: PRIORITY_COLOR[task.priority] }}>
                  {task.priority}
                </span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: '#f5f5f5', color: '#666' }}>
                  {(task.task_type || 'task').replace('_', ' ')}
                </span>
                {isOverdue(task) && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#fcebeb', color: '#a32d2d', fontWeight: 500 }}>Overdue</span>}
              </div>
              {task.notes && <div style={{ fontSize: 12, color: '#888' }}>{task.notes}</div>}
              {task.due_date && (
                <div style={{ fontSize: 11, color: isOverdue(task) ? '#e24b4a' : '#aaa', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} />
                  {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <button onClick={() => setModal(task)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              Edit
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <TaskModal
          task={modal === 'new' ? null : modal}
          users={users}
          onClose={() => setModal(null)}
          onSave={() => { toast.success('Task saved!'); fetchTasks(); }}
        />
      )}
    </div>
  );
}
