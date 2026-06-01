// src/pages/ClientDetail.jsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, RotateCcw, FileText, Download, Upload,
  UserX, CheckCircle, Edit2, Copy, Check, Phone, Mail,
  Building2, IndianRupee, Clock, AlertCircle, X, ExternalLink,
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useResponsive from '../utils/useResponsive';

// ─── Constants ──────────────────────────────────────────────────
const ORG_TYPES   = ['NGO', 'FPO', 'Research', 'Community', 'Social Enterprise', 'Other'];
const AVATAR_COLORS = ['#2d9d78','#3b8bd4','#C70073','#534ab7','#ef9f27','#e24b4a'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const STATUS_META = {
  active:   { bg: '#eaf3de', color: '#3b6d11', label: 'Active'   },
  inactive: { bg: '#f8f7f4', color: '#888',    label: 'Inactive' },
  churned:  { bg: '#fff3cd', color: '#856404', label: 'Churned'  },
  deleted:  { bg: '#fcebeb', color: '#a32d2d', label: 'Deleted'  },
};

const INV_STATUS = {
  draft:    { bg: '#f8f7f4', color: '#888'    },
  sent:     { bg: '#eeedfe', color: '#534ab7' },
  paid:     { bg: '#eaf3de', color: '#3b6d11' },
  overdue:  { bg: '#fcebeb', color: '#a32d2d' },
  cancelled:{ bg: '#f8f7f4', color: '#aaa'    },
};

const COMP_STATUS = {
  pending:     { bg: '#faeeda', color: '#854f0b' },
  in_progress: { bg: '#eeedfe', color: '#534ab7' },
  completed:   { bg: '#eaf3de', color: '#3b6d11' },
  overdue:     { bg: '#fcebeb', color: '#a32d2d' },
};

// ─── Helpers ────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
function daysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function timeAgo(d) {
  if (!d) return '';
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Skeleton ───────────────────────────────────────────────────
function Sk({ w = '100%', h = 13, r = 6, mb = 0 }) {
  return <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb,
    background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
    backgroundSize: '200% 100%', animation: 'sk 1.4s infinite' }} />;
}

// ─── Edit Client Modal ───────────────────────────────────────────
function EditClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({ ...client });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };
  const foc = e => { e.target.style.borderColor = '#2d9d78'; };
  const blr = e => { e.target.style.borderColor = '#e8e5e0'; };

  const handleSave = async () => {
    if (!form.org_name?.trim()) return toast.error('Organization name is required');
    setSaving(true);
    try {
      const payload = {
        org_name: form.org_name, org_type: form.org_type, status: form.status,
        pan_number: form.pan_number, gstin: form.gstin,
        registration_number: form.registration_number, website: form.website,
        city: form.city, state: form.state, pincode: form.pincode, address: form.address,
        simplykhata_active: form.simplykhata_active, merahisab_active: form.merahisab_active,
      };
      const { data } = await api.patch(`/clients/${client.id}`, payload);
      onSave(data);
      onClose();
      toast.success('Client updated');
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 580, maxHeight: '92vh', overflowY: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Organization Name *</label>
            <input style={inp} value={form.org_name || ''} onChange={e => set('org_name', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Org Type</label>
            <select style={inp} value={form.org_type || ''} onChange={e => set('org_type', e.target.value)} onFocus={foc} onBlur={blr}>
              <option value="">Select…</option>
              {ORG_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status || 'active'} onChange={e => set('status', e.target.value)} onFocus={foc} onBlur={blr}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>
          <div>
            <label style={lbl}>PAN Number</label>
            <input style={inp} value={form.pan_number || ''} onChange={e => set('pan_number', e.target.value.toUpperCase())} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>GSTIN</label>
            <input style={inp} value={form.gstin || ''} onChange={e => set('gstin', e.target.value.toUpperCase())} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Registration No.</label>
            <input style={inp} value={form.registration_number || ''} onChange={e => set('registration_number', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Website</label>
            <input style={inp} value={form.website || ''} onChange={e => set('website', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>City</label>
            <input style={inp} value={form.city || ''} onChange={e => set('city', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>State</label>
            <input style={inp} value={form.state || ''} onChange={e => set('state', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div>
            <label style={lbl}>Pincode</label>
            <input style={inp} value={form.pincode || ''} onChange={e => set('pincode', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Address</label>
            <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }} value={form.address || ''} onChange={e => set('address', e.target.value)} onFocus={foc} onBlur={blr} />
          </div>
          <div style={{ gridColumn: '1/-1', borderTop: '1px solid #f0ede8', paddingTop: 16 }}>
            <label style={{ ...lbl, color: '#C70073', fontSize: 13, marginBottom: 10 }}>Active Merum SaaS Solutions</label>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['simplykhata_active','SimplyKhata deployed','#00a99d'],['merahisab_active','Mera Hisab deployed','#534ab7']].map(([k,l,c]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: c, width: 16, height: 16 }} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid #f0ede8' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 24px', background: saving ? '#ccc' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────
function DetailRow({ label, value, copyable }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f8f7f4', fontSize: 13 }}>
      <span style={{ color: '#888', flexShrink: 0, minWidth: 130 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#1a1a18', fontWeight: 500, textAlign: 'right' }}>{value}</span>
        {copyable && (
          <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#2d9d78' : '#ccc', padding: 2, display: 'flex' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function ClientDetail() {
  const { isMobile } = useResponsive();
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [client, setClient]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [tab, setTab]             = useState('overview');
  const [editModal, setEditModal] = useState(false);

  // Danger actions
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [showOffboardModal, setShowOffboardModal]   = useState(false);
  const [offboardReason, setOffboardReason]         = useState('');
  const [actionLoading, setActionLoading]           = useState(false);

  // Tab data
  const [invoices, setInvoices]       = useState([]);
  const [compliance, setCompliance]   = useState([]);
  const [docs, setDocs]               = useState([]);
  const [activities, setActivities]   = useState([]);
  const [onboardingTasks, setOnboardingTasks] = useState([]);
  const [tabLoading, setTabLoading]   = useState(false);

  // Summary KPIs (loaded on mount, alongside client)
  const [kpis, setKpis] = useState(null);

  const isAdmin   = user?.role === 'admin';
  const isManager = ['admin','manager'].includes(user?.role);

  // ── Load client + KPIs on mount ──
  const loadClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientRes, invRes, compRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get('/invoices', { params: { client_id: id, limit: 200 } }),
        api.get('/compliance', { params: { client_id: id, limit: 200 } }),
      ]);
      setClient(clientRes.data);
      const invs  = invRes.data.data  || [];
      const comps = compRes.data.data || [];
      setInvoices(invs);
      setCompliance(comps);
      setKpis({
        totalInvoiced:  invs.reduce((s, i) => s + +i.total_amount, 0),
        totalCollected: invs.filter(i => i.status === 'paid').reduce((s, i) => s + +i.total_amount, 0),
        totalPending:   invs.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + +i.total_amount, 0),
        overdueComp:    comps.filter(i => i.status === 'overdue').length,
        pendingComp:    comps.filter(i => ['pending','in_progress'].includes(i.status)).length,
        invoiceCount:   invs.length,
        compCount:      comps.length,
      });
    } catch (err) {
      setError('Could not load client. It may have been deleted.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadClient(); }, [loadClient]);

  // ── Load onboarding tasks for overview ──
  useEffect(() => {
    api.get(`/tasks`, { params: { related_id: id, task_type: 'onboarding', limit: 50 } })
      .then(r => setOnboardingTasks(r.data.data || [])).catch(() => {});
  }, [id]);

  // ── Lazy-load tab data ──
  useEffect(() => {
    if (tab === 'documents') {
      setTabLoading(true);
      api.get(`/documents`, { params: { client_id: id } })
        .then(r => setDocs(r.data.data || [])).finally(() => setTabLoading(false));
    } else if (tab === 'activity') {
      setTabLoading(true);
      api.get(`/activity`, { params: { entity_id: id } })
        .then(r => setActivities(r.data.data || [])).finally(() => setTabLoading(false));
    }
  }, [tab, id]);

  // ── Actions ──
  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      setOnboardingTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch { toast.error('Failed to update task'); }
  };

  const handleOffboard = async () => {
    setActionLoading(true);
    try {
      await api.post(`/clients/${id}/offboard`, { reason: offboardReason });
      toast.success('Client offboarded');
      const { data } = await api.get(`/clients/${id}`);
      setClient(data);
      setShowOffboardModal(false);
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to offboard'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client archived');
      navigate('/clients');
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to delete'); }
    finally { setActionLoading(false); setShowDeleteConfirm(false); }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/clients/${id}`, { status: 'active' });
      setClient(data);
      toast.success('Client restored');
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to restore'); }
    finally { setActionLoading(false); }
  };

  const handleBulkUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    fd.append('client_id', id);
    fd.append('doc_type', 'Client Upload');
    Array.from(files).forEach(f => fd.append('files', f));
    setTabLoading(true);
    try {
      await api.post('/documents/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Documents uploaded');
      const r = await api.get('/documents', { params: { client_id: id } });
      setDocs(r.data.data || []);
    } catch (err) { toast.error(err?.response?.data?.error || 'Upload failed'); }
    finally { setTabLoading(false); }
  };

  // ── Skeleton loading ──
  if (loading) return (
    <div>
      <style>{`@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Sk w={32} h={32} r={8} />
        <div><Sk w={220} h={22} mb={8} /><Sk w={160} h={13} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[1,2,3,4].map(i => <Sk key={i} h={80} r={12} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Sk h={220} r={12} />
        <Sk h={220} r={12} />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#aaa' }}>
      <AlertCircle size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: '#555', marginBottom: 8 }}>{error}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => loadClient()} style={{ padding: '8px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
        <button onClick={() => navigate('/clients')} style={{ padding: '8px 20px', border: '1px solid #ddd', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>← Back to Clients</button>
      </div>
    </div>
  );

  const sm  = STATUS_META[client.status] || STATUS_META.inactive;
  const ac  = avatarColor(client.org_name);
  const compDone = onboardingTasks.filter(t => t.status === 'completed').length;
  const onboardPct = onboardingTasks.length ? Math.round(compDone / onboardingTasks.length * 100) : null;

  const TABS = [
    { key: 'overview',    label: 'Overview'              },
    { key: 'contacts',    label: 'Contacts', count: client.contacts?.length },
    { key: 'services',    label: 'Services', count: client.client_services?.length },
    { key: 'compliance',  label: 'Compliance', count: kpis?.compCount  },
    { key: 'invoices',    label: 'Invoices',   count: kpis?.invoiceCount },
    { key: 'documents',   label: 'Documents'             },
    { key: 'activity',    label: 'Activity'              },
  ];

  return (
    <div>
      <style>{`@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/clients')} style={{ border: 'none', background: '#f8f7f4', cursor: 'pointer', padding: 8, borderRadius: 9, color: '#555', display: 'flex' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: ac + '22', border: `2px solid ${ac}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: ac, flexShrink: 0 }}>
            {client.org_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a18' }}>{client.org_name}</h1>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sm.bg, color: sm.color, fontWeight: 700 }}>{sm.label}</span>
              {client.is_offboard && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#fff3e0', color: '#e65100', fontWeight: 700 }}>Offboard</span>}
            </div>
            <div style={{ fontSize: 12.5, color: '#888', marginTop: 3 }}>
              {[client.org_type, client.city, client.state].filter(Boolean).join(' · ')}
              {client.gstin && <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 11, color: '#aaa' }}>{client.gstin}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isManager && (
            <button onClick={() => setEditModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Edit2 size={14} /> Edit
            </button>
          )}
          {isManager && client.status === 'active' && (
            <button onClick={() => setShowOffboardModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff3e0', color: '#856404', border: '1px solid #ffd97d', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <UserX size={14} /> Offboard
            </button>
          )}
          {isAdmin && client.status !== 'deleted' && (
            <button onClick={() => setShowDeleteConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fcebeb', color: '#a32d2d', border: '1px solid #f5c6c6', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          {isAdmin && client.status === 'deleted' && (
            <button onClick={handleRestore} disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#eaf3de', color: '#3b6d11', border: '1px solid #b7dfad', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <RotateCcw size={14} /> {actionLoading ? 'Restoring…' : 'Restore'}
            </button>
          )}
        </div>
      </div>

      {/* ── Deleted banner ── */}
      {client.status === 'deleted' && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 13, color: '#a32d2d', fontWeight: 500 }}>
          🗑️ This client is archived. {isAdmin ? 'Click Restore to reactivate.' : 'Contact an admin to restore.'}
        </div>
      )}

      {/* ── KPI summary bar ── */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 5}, 1fr)`, gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Invoiced',  val: fmt(kpis.totalInvoiced),  color: '#534ab7', bg: '#eeedfe', Icon: FileText    },
            { label: 'Collected',       val: fmt(kpis.totalCollected), color: '#3b6d11', bg: '#eaf3de', Icon: IndianRupee },
            { label: 'Pending',         val: fmt(kpis.totalPending),   color: kpis.totalPending > 0 ? '#a32d2d' : '#888', bg: kpis.totalPending > 0 ? '#fcebeb' : '#f8f7f4', Icon: AlertCircle },
            { label: 'Compliance Due',  val: kpis.pendingComp,         color: '#854f0b', bg: '#faeeda', Icon: Clock       },
            { label: 'Comp. Overdue',   val: kpis.overdueComp,         color: kpis.overdueComp > 0 ? '#a32d2d' : '#3b6d11', bg: kpis.overdueComp > 0 ? '#fcebeb' : '#eaf3de', Icon: CheckCircle },
          ].map(({ label, val, color, bg, Icon }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: '#888', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a18' }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onboarding progress bar (if tasks exist) ── */}
      {onboardPct !== null && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#555', flexShrink: 0 }}>Onboarding</span>
          <div style={{ flex: 1, height: 8, background: '#f0ede8', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ width: `${onboardPct}%`, height: '100%', background: onboardPct === 100 ? '#2d9d78' : '#3b8bd4', borderRadius: 10, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: onboardPct === 100 ? '#2d9d78' : '#888', flexShrink: 0 }}>{compDone}/{onboardingTasks.length} done</span>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #f0ede8', marginBottom: 22, overflowX: 'auto' }}>
        {TABS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '9px 18px', border: 'none', borderBottom: tab === key ? '2px solid #2d9d78' : '2px solid transparent',
              marginBottom: -2, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 700 : 400,
              color: tab === key ? '#2d9d78' : '#666', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            {label}
            {count > 0 && (
              <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 10, background: tab === key ? '#e1f5ee' : '#f0ede8', color: tab === key ? '#2d9d78' : '#888', fontWeight: 700 }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {/* Organisation details */}
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#333' }}>Organisation Details</h3>
            <DetailRow label="Registration No." value={client.registration_number} />
            <DetailRow label="PAN" value={client.pan_number} copyable />
            <DetailRow label="GSTIN" value={client.gstin} copyable />
            <DetailRow label="Website" value={client.website} />
            <DetailRow label="Onboarded" value={client.onboarded_on ? new Date(client.onboarded_on).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : null} />
            <DetailRow label="Account Manager" value={client.users?.full_name} />
            <DetailRow label="Last Updated" value={client.updated_at ? timeAgo(client.updated_at) : null} />
          </div>

          {/* Address + SaaS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#333' }}>Address</h3>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 }}>
                {client.address && <>{client.address}<br /></>}
                {[client.city, client.state, client.pincode].filter(Boolean).join(', ')}<br />
                {client.country || 'India'}
              </p>
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 12.5, color: '#3b8bd4', textDecoration: 'none' }}>
                  <ExternalLink size={12} /> {client.website}
                </a>
              )}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#C70073' }}>Active SaaS Products</h3>
              {[
                { key: 'simplykhata_active', name: 'SimplyKhata', color: '#00a99d' },
                { key: 'merahisab_active',   name: 'Mera Hisab',  color: '#534ab7' },
              ].map(({ key, name, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8f7f4', fontSize: 13 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: client[key] ? color : '#e0ddd8', flexShrink: 0 }} />
                  <span style={{ fontWeight: client[key] ? 600 : 400, color: client[key] ? '#1a1a18' : '#aaa' }}>{name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 10, background: client[key] ? color + '18' : '#f8f7f4', color: client[key] ? color : '#bbb', fontWeight: 600 }}>
                    {client[key] ? 'Active' : 'Not deployed'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Onboarding checklist */}
          {onboardingTasks.length > 0 && (
            <div style={{ gridColumn: '1/-1', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} color="#2d9d78" /> Onboarding Checklist
                </h3>
                <span style={{ fontSize: 12, color: '#888' }}>{compDone} of {onboardingTasks.length} completed</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {onboardingTasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(task.id, task.status)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                      background: task.status === 'completed' ? '#faf9f7' : '#fff',
                      border: '1px solid #f0ede8', borderRadius: 9, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d9d78'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0ede8'; }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${task.status === 'completed' ? '#2d9d78' : '#ddd'}`,
                      background: task.status === 'completed' ? '#2d9d78' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {task.status === 'completed' && <Check size={11} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: task.status === 'completed' ? '#aaa' : '#1a1a18', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                        {task.title}
                      </div>
                      {task.notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{task.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active services summary */}
          <div style={{ gridColumn: '1/-1', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#333' }}>
              Active Services ({client.client_services?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {client.client_services?.length > 0
                ? client.client_services.map(cs => (
                    <span key={cs.id} style={{ padding: '6px 14px', background: '#e1f5ee', color: '#0f6e56', borderRadius: 20, fontSize: 12.5, fontWeight: 600 }}>
                      {cs.services?.name}
                    </span>
                  ))
                : <span style={{ color: '#bbb', fontSize: 13 }}>No active services</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CONTACTS TAB
      ══════════════════════════════════════════ */}
      {tab === 'contacts' && (
        <div>
          {!client.contacts?.length ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
              <Building2 size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
              No contacts on record for this client.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {client.contacts.map(c => (
                <div key={c.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#185fa5' }}>
                      {c.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.full_name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{c.designation || '—'}</div>
                    </div>
                    {c.is_primary && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#e1f5ee', color: '#0f6e56', fontWeight: 700 }}>Primary</span>
                    )}
                  </div>
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#3b8bd4', textDecoration: 'none', marginBottom: 6 }}>
                      <Mail size={12} /> {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#2d9d78', textDecoration: 'none' }}>
                      <Phone size={12} /> {c.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          SERVICES TAB
      ══════════════════════════════════════════ */}
      {tab === 'services' && (
        <div>
          {!client.client_services?.length ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
              No services enrolled for this client.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
                    {['Service', 'Category', 'Start Date', 'End Date', 'Fee / Month', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {client.client_services.map(cs => (
                    <tr key={cs.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '13px 16px', fontWeight: 600, color: '#1a1a18' }}>{cs.services?.name || '—'}</td>
                      <td style={{ padding: '13px 16px', color: '#666' }}>{cs.services?.category || '—'}</td>
                      <td style={{ padding: '13px 16px', color: '#666' }}>{cs.start_date ? new Date(cs.start_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}</td>
                      <td style={{ padding: '13px 16px', color: '#666' }}>{cs.end_date ? new Date(cs.end_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'Ongoing'}</td>
                      <td style={{ padding: '13px 16px', color: '#555', fontWeight: 500 }}>{cs.fee_per_month ? fmt(cs.fee_per_month) : '—'}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: cs.status === 'active' ? '#eaf3de' : '#f8f7f4', color: cs.status === 'active' ? '#3b6d11' : '#888', fontWeight: 700 }}>
                          {cs.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          COMPLIANCE TAB
      ══════════════════════════════════════════ */}
      {tab === 'compliance' && (
        <div>
          {!compliance.length ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
              <CheckCircle size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
              No compliance items for this client.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
                    {['Title', 'Category', 'Due Date', 'Priority', 'Assigned To', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compliance.map(item => {
                    const days = daysUntil(item.due_date);
                    const cs = COMP_STATUS[item.status] || COMP_STATUS.pending;
                    const urgentBorder = item.status !== 'completed' && days < 0 ? '#e24b4a' : days <= 3 ? '#ef9f27' : 'transparent';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0ede8', borderLeft: `3px solid ${urgentBorder}` }}>
                        <td style={{ padding: '13px 16px', fontWeight: 600, color: '#1a1a18' }}>{item.title}</td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 8, background: '#f0ede8', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>{item.category}</span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ color: days < 0 ? '#e24b4a' : '#333', fontSize: 13 }}>
                            {new Date(item.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          </div>
                          {item.status !== 'completed' && <div style={{ fontSize: 10.5, color: days < 0 ? '#e24b4a' : days <= 7 ? '#ef9f27' : '#aaa' }}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                          </div>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: item.priority === 'high' ? '#fcebeb' : item.priority === 'critical' ? '#fee2e2' : '#faeeda',
                            color: item.priority === 'high' ? '#a32d2d' : item.priority === 'critical' ? '#7f1d1d' : '#854f0b',
                            fontWeight: 700, textTransform: 'capitalize' }}>
                            {item.priority}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', color: '#666', fontSize: 12.5 }}>{item.users?.full_name || 'Unassigned'}</td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: cs.bg, color: cs.color, fontWeight: 700 }}>
                            {item.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          INVOICES TAB
      ══════════════════════════════════════════ */}
      {tab === 'invoices' && (
        <div>
          {!invoices.length ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
              <FileText size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
              No invoices found for this client.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
                    {['Invoice #', 'Issue Date', 'Due Date', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const is = INV_STATUS[inv.status] || INV_STATUS.draft;
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                        <td style={{ padding: '13px 16px', fontWeight: 700, color: '#185fa5', fontFamily: 'monospace', fontSize: 12.5 }}>{inv.invoice_number}</td>
                        <td style={{ padding: '13px 16px', color: '#666' }}>
                          {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '13px 16px', color: inv.status === 'overdue' ? '#e24b4a' : '#666' }}>
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '13px 16px', fontWeight: 700, color: '#1a1a18' }}>{fmt(inv.total_amount)}</td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: is.bg, color: is.color, fontWeight: 700, textTransform: 'capitalize' }}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Revenue summary footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '14px 20px', background: '#f8f7f4', borderTop: '1px solid #e8e6e0', fontSize: 13 }}>
                <span style={{ color: '#888' }}>Total invoiced: <b style={{ color: '#1a1a18' }}>{fmt(kpis?.totalInvoiced)}</b></span>
                <span style={{ color: '#888' }}>Collected: <b style={{ color: '#3b6d11' }}>{fmt(kpis?.totalCollected)}</b></span>
                <span style={{ color: '#888' }}>Pending: <b style={{ color: kpis?.totalPending > 0 ? '#e24b4a' : '#888' }}>{fmt(kpis?.totalPending)}</b></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          DOCUMENTS TAB
      ══════════════════════════════════════════ */}
      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>Client Documents</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#2d9d78', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: tabLoading ? 'not-allowed' : 'pointer', opacity: tabLoading ? 0.7 : 1 }}>
              <Upload size={14} /> {tabLoading ? 'Uploading…' : 'Upload Documents'}
              <input type="file" multiple onChange={handleBulkUpload} disabled={tabLoading} style={{ display: 'none' }} />
            </label>
          </div>
          {tabLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {[1,2,3,4].map(i => <Sk key={i} h={90} r={10} />)}
            </div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
              <FileText size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
              No documents uploaded yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '15px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <FileText size={20} color="#3b8bd4" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{doc.doc_type}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#aaa' }}>
                    <span>{new Date(doc.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b8bd4', fontSize: 12, textDecoration: 'none' }}>
                      <Download size={13} /> Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          ACTIVITY TAB
      ══════════════════════════════════════════ */}
      {tab === 'activity' && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>Activity Log</h3>
          {tabLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <Sk w={34} h={34} r={17} />
                  <div style={{ flex: 1 }}><Sk w="55%" h={13} mb={7} /><Sk w="35%" h={11} /></div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#bbb' }}>No activity recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activities.map((act, i) => (
                <div key={act.id} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 16 }}>
                  {i < activities.length - 1 && <div style={{ position: 'absolute', top: 34, bottom: 0, left: 16, width: 2, background: '#f0ede8' }} />}
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#C70073' + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#C70073', flexShrink: 0, zIndex: 1 }}>
                    {act.users?.full_name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>
                      <b style={{ color: '#1a1a18' }}>{act.users?.full_name || 'System'}</b>{' '}
                      {act.action?.replace(/_/g, ' ')}
                    </div>
                    {act.notes && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 5, background: '#f8f7f4', padding: '6px 10px', borderRadius: 7 }}>{act.notes}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{timeAgo(act.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════ */}
      {editModal && (
        <EditClientModal client={client} onClose={() => setEditModal(false)}
          onSave={(updated) => { setClient(prev => ({ ...prev, ...updated })); }} />
      )}

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 420, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fcebeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#a32d2d" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Delete Client?</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>This action can be undone by an admin.</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, background: '#f8f7f4', borderRadius: 9, padding: '10px 14px', margin: '0 0 20px' }}>
              <b>{client.org_name}</b> will be archived. All invoices, contacts, and records are preserved.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: actionLoading ? '#ccc' : '#e24b4a', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Trash2 size={13} /> {actionLoading ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOffboardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 420, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserX size={20} color="#856404" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Offboard Client?</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>This will mark the client as Churned.</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 14 }}>
              Offboarding <b>{client.org_name}</b> will cancel all active services and record today as the end date.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Reason (optional)</label>
              <textarea value={offboardReason} onChange={e => setOffboardReason(e.target.value)}
                placeholder="e.g. Project completed, budget cuts…"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, minHeight: 70, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowOffboardModal(false)} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleOffboard} disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: actionLoading ? '#ccc' : '#d97706', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <UserX size={13} /> {actionLoading ? 'Offboarding…' : 'Confirm Offboarding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
