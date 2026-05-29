// src/pages/ClientDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RotateCcw, FileText, Download, Upload, UserX, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useResponsive from '../utils/useResponsive';

export default function ClientDetail() {
  const { isMobile } = useResponsive();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState('overview');
  const [onboardingTasks, setOnboardingTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOffboardModal, setShowOffboardModal] = useState(false);
  const [offboardReason, setOffboardReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (tab === 'documents') {
      setLoadingDocs(true);
      api.get(`/documents?client_id=${id}`).then(r => setDocs(r.data.data || [])).finally(() => setLoadingDocs(false));
    } else if (tab === 'activity') {
      setLoadingActivities(true);
      api.get(`/activity?entity_id=${id}`).then(r => setActivities(r.data.data || [])).finally(() => setLoadingActivities(false));
    }
  }, [tab, id]);

  const handleBulkUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingDocs(true);
    const formData = new FormData();
    formData.append('client_id', id);
    formData.append('doc_type', 'Client Upload');
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      await api.post('/documents/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Documents uploaded successfully');
      const res = await api.get(`/documents?client_id=${id}`);
      setDocs(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload documents');
    } finally {
      setUploadingDocs(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    api.get(`/clients/${id}`).then(r => setClient(r.data)).catch(() => navigate('/clients'));
    
    // Fetch Onboarding Checklist
    setLoadingTasks(true);
    api.get(`/tasks?related_id=${id}&task_type=onboarding`)
      .then(r => setOnboardingTasks(r.data.data || []))
      .finally(() => setLoadingTasks(false));
  }, [id]);

  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      setOnboardingTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleOffboard = async () => {
    setActionLoading(true);
    try {
      await api.post(`/clients/${id}/offboard`, { reason: offboardReason });
      toast.success('Client offboarded successfully');
      const res = await api.get(`/clients/${id}`);
      setClient(res.data);
      setShowOffboardModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to offboard client');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client deleted and archived successfully.');
      navigate('/clients');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete client.');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/clients/${id}`, { status: 'active' });
      setClient(data);
      toast.success('Client restored successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to restore client.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!client) return <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading…</div>;

  const tabs = ['overview', 'contacts', 'services', 'compliance', 'invoices', 'documents', 'activity'];

  const STATUS_COLOR = {
    active:   { bg: '#eaf3de', color: '#3b6d11' },
    inactive: { bg: '#f8f7f4', color: '#888' },
    churned:  { bg: '#fff3cd', color: '#856404' },
    deleted:  { bg: '#fcebeb', color: '#a32d2d' },
  };
  const sStyle = STATUS_COLOR[client.status] || STATUS_COLOR.inactive;
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <button onClick={() => navigate('/clients')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#888' }}><ArrowLeft size={18} /></button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a18' }}>{client.org_name}</h1>
            <span style={{ fontSize: 12, color: '#888' }}>{client.org_type} · {client.city}, {client.state}</span>
          </div>
          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: sStyle.bg, color: sStyle.color, fontWeight: 600, textTransform: 'capitalize', marginLeft: 8 }}>
            {client.status}
          </span>
        </div>

        {/* Admin/Manager Actions */}
        {(isManager || isAdmin) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: isMobile ? 12 : 0 }}>
            {isManager && client.status === 'active' && (
              <button
                onClick={() => setShowOffboardModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}
              >
                <UserX size={13} /> Offboard Client
              </button>
            )}
            {isAdmin && client.status !== 'deleted' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#fcebeb', color: '#a32d2d', border: '1px solid #f5c6c6', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}
              >
                <Trash2 size={13} /> Delete Client
              </button>
            )}
            {isAdmin && client.status === 'deleted' && (
              <button
                onClick={handleRestore}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#eaf3de', color: '#3b6d11', border: '1px solid #b7dfad', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}
              >
                <RotateCcw size={13} /> {actionLoading ? 'Restoring…' : 'Restore Client'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Deleted Banner */}
      {client.status === 'deleted' && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trash2 size={16} color="#a32d2d" />
          <span style={{ fontSize: 13, color: '#a32d2d', fontWeight: 500 }}>
            This client has been deleted and is archived. {isAdmin ? 'You can restore it using the button above.' : 'Contact an admin to restore.'}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="res-tabs-scroll" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e8e6e0', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', borderBottom: tab === t ? '2px solid #2d9d78' : '2px solid transparent',
            background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? '#2d9d78' : '#666', textTransform: 'capitalize'
          }}>{t}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#444' }}>Organization Details</h3>
            {[
              ['Registration No.', client.registration_number],
              ['PAN', client.pan_number],
              ['GSTIN', client.gstin],
              ['Website', client.website],
              ['Onboarded', client.onboarded_on ? new Date(client.onboarded_on).toLocaleDateString('en-IN') : '—'],
              ['Account Manager', client.users?.full_name || '—'],
            ].map(([k, v]) => v && (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                <span style={{ color: '#888' }}>{k}</span>
                <span style={{ color: '#1a1a18', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#444' }}>Address</h3>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                {client.address || '—'}<br />
                {[client.city, client.state, client.pincode].filter(Boolean).join(', ')}<br />
                {client.country}
              </p>
            </div>
            <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 14 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#C70073' }}>Active SaaS Products</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ 
                    width: 10, height: 10, borderRadius: '50%', 
                    background: client.simplykhata_active ? '#2d9d78' : '#ccc' 
                  }} />
                  <span style={{ color: client.simplykhata_active ? '#1a1a18' : '#888', fontWeight: client.simplykhata_active ? 500 : 400 }}>
                    SimplyKhata: {client.simplykhata_active ? 'Active' : 'Not Deployed'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ 
                    width: 10, height: 10, borderRadius: '50%', 
                    background: client.merahisab_active ? '#2d9d78' : '#ccc' 
                  }} />
                  <span style={{ color: client.merahisab_active ? '#1a1a18' : '#888', fontWeight: client.merahisab_active ? 500 : 400 }}>
                    Mera Hisab: {client.merahisab_active ? 'Active' : 'Not Deployed'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Onboarding Checklist Card */}
          {onboardingTasks.length > 0 && (
            <div style={{ gridColumn: '1/-1', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} color="#2d9d78" /> Onboarding Checklist
                </h3>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>
                  {onboardingTasks.filter(t => t.status === 'completed').length} of {onboardingTasks.length} completed
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                {onboardingTasks.map(task => (
                  <div key={task.id} 
                    onClick={() => toggleTask(task.id, task.status)}
                    style={{ 
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', 
                      background: task.status === 'completed' ? '#f8f7f4' : '#fff', 
                      border: '1px solid #e8e6e0', borderRadius: 10, cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}>
                    <div style={{ marginTop: 2 }}>
                      <div style={{ 
                        width: 18, height: 18, borderRadius: 4, border: `2px solid ${task.status === 'completed' ? '#2d9d78' : '#ddd'}`,
                        background: task.status === 'completed' ? '#2d9d78' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {task.status === 'completed' && <CheckCircle size={12} color="#fff" />}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: task.status === 'completed' ? '#aaa' : '#1a1a18', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{task.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Services */}
          <div style={{ gridColumn: '1/-1', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#444' }}>Active Services ({client.client_services?.length || 0})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {client.client_services?.map(cs => (
                <span key={cs.id} style={{ padding: '6px 14px', background: '#e1f5ee', color: '#0f6e56', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                  {cs.services?.name}
                </span>
              ))}
              {(!client.client_services || client.client_services.length === 0) && (
                <span style={{ color: '#aaa', fontSize: 13 }}>No active services</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {tab === 'contacts' && (
        <div>
          {client.contacts?.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No contacts yet</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {client.contacts?.map(c => (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#185fa5' }}>
                    {c.full_name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.full_name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{c.designation || '—'}</div>
                  </div>
                  {c.is_primary && <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#e1f5ee', color: '#0f6e56' }}>Primary</span>}
                </div>
                {c.email && <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>✉ {c.email}</div>}
                {c.phone && <div style={{ fontSize: 12, color: '#555' }}>📞 {c.phone}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a18' }}>Client Documents</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2d9d78', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploadingDocs ? 'not-allowed' : 'pointer', opacity: uploadingDocs ? 0.7 : 1 }}>
              <Upload size={14} /> {uploadingDocs ? 'Uploading...' : 'Bulk Upload Documents'}
              <input type="file" multiple onChange={handleBulkUpload} disabled={uploadingDocs} style={{ display: 'none' }} />
            </label>
          </div>
          {loadingDocs ? <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading documents...</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <FileText size={20} color="#3b8bd4" />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{doc.doc_type}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#aaa' }}>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b8bd4' }}><Download size={14} /></a>
                  </div>
                </div>
              ))}
              {docs.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#aaa' }}>No documents uploaded for this client yet.</div>}
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1a1a18' }}>Activity Log</h3>
          {loadingActivities ? <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading activity...</div> : (
            <div>
              {activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No recent activity.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {activities.map((act, i) => (
                    <div key={act.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                      {i !== activities.length - 1 && <div style={{ position: 'absolute', top: 30, bottom: -16, left: 16, width: 2, background: '#f0f0f0' }} />}
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#0f6e56', zIndex: 1 }}>
                        {act.users?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 16 }}>
                        <div style={{ fontSize: 13, color: '#333' }}>
                          <span style={{ fontWeight: 600 }}>{act.users?.full_name || 'System'}</span>{' '}
                          {act.action.replace(/_/g, ' ')}
                        </div>
                        {act.notes && <div style={{ fontSize: 12, color: '#666', marginTop: 4, background: '#f8f7f4', padding: '6px 10px', borderRadius: 6 }}>{act.notes}</div>}
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                          {new Date(act.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {['services', 'compliance', 'invoices'].includes(tab) && (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🚧</div>
          <p style={{ margin: 0, fontSize: 14 }}>This section is ready to build. Connect the API route and render data here.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? '95%' : 420, padding: isMobile ? 20 : 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fcebeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#a32d2d" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>Delete Client?</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>This action can be undone by an admin.</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, background: '#f8f7f4', borderRadius: 8, padding: '10px 14px', margin: '0 0 20px' }}>
              <strong>{client.org_name}</strong> will be archived and hidden from all standard views. All invoices, contacts, and records will be preserved.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: actionLoading ? '#aaa' : '#e24b4a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                <Trash2 size={13} /> {actionLoading ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offboard Confirmation Modal */}
      {showOffboardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? '95%' : 420, padding: isMobile ? 20 : 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff3cd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserX size={20} color="#856404" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>Offboard Client?</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>This will mark the client as "Churned".</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
              Offboarding <strong>{client.org_name}</strong> will automatically cancel all their active services and record the current date as the end date.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Reason for offboarding (optional)</label>
              <textarea
                value={offboardReason}
                onChange={(e) => setOffboardReason(e.target.value)}
                placeholder="e.g. Project completed, budget cuts, etc."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowOffboardModal(false)}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleOffboard}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: actionLoading ? '#aaa' : '#d97706', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                <UserX size={13} /> {actionLoading ? 'Offboarding…' : 'Confirm Offboarding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
