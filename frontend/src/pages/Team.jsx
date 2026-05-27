// src/pages/Team.jsx
import { useEffect, useState } from 'react';
import { Plus, Shield, Phone, Mail, UserX, Key } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'manager', 'accountant', 'sales', 'viewer'];
const ROLE_STYLE = {
  admin:      { bg: '#fcebeb', color: '#a32d2d' },
  manager:    { bg: '#eeedfe', color: '#534ab7' },
  accountant: { bg: '#faeeda', color: '#854f0b' },
  sales:      { bg: '#eaf3de', color: '#3b6d11' },
  viewer:     { bg: '#f8f7f4', color: '#888' },
};

// ── Create / Edit User Modal ────────────────────────────────────
function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState(
    user || { full_name: '', email: '', password: '', phone: '', role_name: 'sales' }
  );
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none'
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.role_name) {
      return toast.error('Name, email and role are required');
    }
    if (!isEdit && !form.password) return toast.error('Password is required for new users');
    if (form.password && form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role_name: form.role_name,
      };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        await api.patch(`/users/${user.id}`, payload);
        toast.success('User updated successfully!');
      } else {
        await api.post('/users', payload);
        toast.success('User created successfully!');
      }
      onSave();
      onClose();
    } catch (err) {
      // error handled by axios interceptor
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 480, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>
            {isEdit ? 'Edit User' : 'Create New User'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
            {isEdit ? 'Update user details or reset password' : 'New user will be able to log in immediately'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} placeholder="e.g. Archana Singh" />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email Address *</label>
            <input style={inputStyle} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="archana@merums.com" disabled={isEdit} />
            {isEdit && <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>Email cannot be changed after creation</div>}
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>

          {/* Role */}
          <div>
            <label style={labelStyle}>Role *</label>
            <select style={inputStyle} value={form.role_name || 'sales'} onChange={e => set('role_name', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            {/* Role description */}
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#f8f7f4', borderRadius: 6, fontSize: 11, color: '#666' }}>
              {form.role_name === 'admin'      && '⚠️ Full access to everything including user management'}
              {form.role_name === 'manager'    && '✅ Can manage leads, clients, tasks, invoices and reports'}
              {form.role_name === 'accountant' && '💰 Can manage invoices, compliance and documents'}
              {form.role_name === 'sales'      && '📊 Can manage leads, view clients and manage own tasks'}
              {form.role_name === 'viewer'     && '👁️ Read-only access to clients and reports only'}
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={inputStyle}
                type={showPass ? 'text' : 'password'}
                value={form.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? 'Enter new password to reset' : 'Minimum 6 characters'}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#aaa', fontSize: 12 }}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
            {form.password && form.password.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: form.password.length >= 6 ? '#2d9d78' : '#e24b4a' }}>
                {form.password.length >= 6 ? '✓ Password strength: Good' : '✗ Too short — minimum 6 characters'}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '9px 22px', background: saving ? '#aaa' : '#2d9d78',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 13,
            fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer'
          }}>
            {saving ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Team Page ──────────────────────────────────────────────
export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | user object
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Deactivate ${u.full_name}? They will not be able to log in.`)) return;
    try {
      await api.patch(`/users/${u.id}/deactivate`);
      toast.success(`${u.full_name} has been deactivated`);
      fetchUsers();
    } catch {}
  };

  const activeUsers   = users.filter(u => u.is_active);
  const inactiveUsers = users.filter(u => !u.is_active);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Team Members</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>
            {activeUsers.length} active users · {inactiveUsers.length} inactive
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('new')} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9,
            fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}>
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {!isAdmin && (
        <div style={{ padding: '10px 14px', background: '#faeeda', borderRadius: 8, fontSize: 13, color: '#854f0b', marginBottom: 16 }}>
          ⚠️ Only Admins can create or edit users.
        </div>
      )}

      {/* Active Users Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading team…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {activeUsers.map(u => {
              const rc = ROLE_STYLE[u.roles?.name] || ROLE_STYLE.viewer;
              const isMe = u.id === currentUser?.id;
              return (
                <div key={u.id} style={{
                  background: '#fff', border: `1px solid ${isMe ? '#2d9d78' : '#e8e6e0'}`,
                  borderRadius: 12, padding: '18px 20px',
                  boxShadow: isMe ? '0 0 0 2px rgba(45,157,120,0.15)' : 'none'
                }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: rc.color, flexShrink: 0 }}>
                        {u.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a18' }}>
                          {u.full_name} {isMe && <span style={{ fontSize: 10, color: '#2d9d78' }}>(You)</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Shield size={10} color={rc.color} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: rc.color, textTransform: 'capitalize', padding: '1px 7px', background: rc.bg, borderRadius: 20 }}>
                            {u.roles?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={11} color="#aaa" /> {u.email}
                  </div>
                  {u.phone && (
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={11} color="#aaa" /> {u.phone}
                    </div>
                  )}
                  {u.last_login && (
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                      Last login: {new Date(u.last_login).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}

                  {/* Admin actions */}
                  {isAdmin && !isMe && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0ede8' }}>
                      <button onClick={() => setModal(u)} style={{
                        flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: 6,
                        background: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: 4, color: '#555'
                      }}>
                        <Key size={11} /> Edit / Reset Password
                      </button>
                      <button onClick={() => handleDeactivate(u)} style={{
                        padding: '6px 10px', border: '1px solid #fcc', borderRadius: 6,
                        background: '#fff', fontSize: 11, cursor: 'pointer', color: '#e24b4a'
                      }}>
                        <UserX size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inactive Users */}
          {inactiveUsers.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 14, color: '#aaa', fontWeight: 600, marginBottom: 10 }}>Inactive Users ({inactiveUsers.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {inactiveUsers.map(u => (
                  <div key={u.id} style={{ background: '#f8f7f4', border: '1px solid #e8e6e0', borderRadius: 10, padding: '12px 16px', opacity: 0.7 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: '#888' }}>{u.full_name}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{u.email}</div>
                    {isAdmin && (
                      <button onClick={() => api.patch(`/users/${u.id}`, { is_active: true }).then(() => { toast.success('User reactivated!'); fetchUsers(); })}
                        style={{ marginTop: 8, padding: '4px 12px', border: '1px solid #2d9d78', borderRadius: 6, background: '#fff', color: '#2d9d78', fontSize: 11, cursor: 'pointer' }}>
                        Reactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={fetchUsers}
        />
      )}
    </div>
  );
}
