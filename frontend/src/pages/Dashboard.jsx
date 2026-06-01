// src/pages/Dashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import {
  Users, TrendingUp, AlertCircle, IndianRupee, CheckCircle,
  Clock, FileText, MessageSquare, ArrowRight, BadgeInfo,
  Plus, RefreshCw, Activity,
} from 'lucide-react';
import api from '../utils/api';
import useResponsive from '../utils/useResponsive';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Constants ────────────────────────────────────────────────
const PIPELINE_COLORS = {
  new: '#3b8bd4', contacted: '#ef9f27', qualified: '#2d9d78',
  proposal_sent: '#7f77dd', converted: '#1d9e75', lost: '#e24b4a',
};

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(n || 0);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function greeting(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name || 'there'} 👋`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, r = 8, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      marginBottom: mb,
    }} />
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0ede8', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <Skeleton w="55%" h={11} mb={8} />
          <Skeleton w="40%" h={22} />
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, sub, onClick, trend }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', border: `1.5px solid ${hovered && onClick ? color + '55' : '#e8e6e0'}`,
        borderRadius: 14, padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        boxShadow: hovered && onClick ? `0 6px 20px ${color}18` : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} color={color} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#888', fontWeight: 500, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', lineHeight: 1 }}>{value ?? 0}</div>
            {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{sub}</div>}
          </div>
        </div>
        {onClick && (
          <ArrowRight size={15} color={hovered ? color : '#ddd'} style={{ transition: 'color 0.2s', marginTop: 4 }} />
        )}
      </div>
    </div>
  );
}

// ─── Compliance urgency helper ─────────────────────────────────
function urgencyStyle(days) {
  if (days < 0)  return { bg: '#fcebeb', color: '#a32d2d', label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { bg: '#fcebeb', color: '#a32d2d', label: 'Due today' };
  if (days <= 3)  return { bg: '#fff3e0', color: '#e65100', label: `${days}d left` };
  if (days <= 7)  return { bg: '#faeeda', color: '#854f0b', label: `${days}d left` };
  return { bg: '#f8f7f4', color: '#666', label: `${days}d left` };
}

// ─── Activity action labels ────────────────────────────────────
const ACTION_LABEL = {
  created: 'created',  updated: 'updated',  deleted: 'deleted',
  converted: 'converted', sent: 'sent', paid: 'paid', filed: 'filed',
};

// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isClient  = user?.role === 'client';
  const { isMobile } = useResponsive();

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [kpis, setKpis]         = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [activity, setActivity] = useState([]);
  const [clientData, setClientData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      if (isClient) {
        const { data } = await api.get('/dashboard/client-summary');
        setClientData(data);
      } else {
        const [kpiRes, pipeRes, upcomingRes] = await Promise.all([
          api.get('/dashboard/kpis'),
          api.get('/dashboard/pipeline'),
          api.get('/dashboard/upcoming-compliance'),
        ]);
        setKpis(kpiRes.data.kpis);
        setActivity(kpiRes.data.recent_activity || []);
        setPipeline(pipeRes.data.map(p => ({
          ...p,
          name: p.status.replace(/_/g, ' '),
        })));
        setUpcoming(upcomingRes.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isClient]);

  useEffect(() => { load(); }, [load]);

  // ── Skeleton loading state ──
  if (loading) return (
    <div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ background: 'linear-gradient(135deg,#C70073,#7e0049)', borderRadius: 14, padding: '28px 32px', marginBottom: 24 }}>
        <Skeleton w="200px" h={28} mb={10} />
        <Skeleton w="300px" h={14} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e8e6e0', height: 300 }}>
          <Skeleton w="140px" h={18} mb={20} />
          <Skeleton w="100%" h={220} r={10} />
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e8e6e0', height: 300 }}>
          <Skeleton w="160px" h={18} mb={20} />
          {[1,2,3,4].map(i => <Skeleton key={i} w="100%" h={48} r={8} mb={10} />)}
        </div>
      </div>
    </div>
  );

  // ── Error state ──
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <AlertCircle size={40} color="#e24b4a" />
      <p style={{ fontSize: 15, color: '#555', textAlign: 'center' }}>{error}</p>
      <button onClick={() => load()} style={{ padding: '9px 22px', background: '#C70073', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );

  // ════════════════════════════════════════
  // CLIENT DASHBOARD
  // ════════════════════════════════════════
  if (isClient) {
    const info  = clientData?.client || {};
    const stats = clientData?.kpis   || {};
    const complianceList = clientData?.compliance || [];

    return (
      <div>
        {/* Welcome banner */}
        <div style={{ background: 'linear-gradient(135deg,#C70073,#7e0049)', borderRadius: 14, padding: isMobile ? '20px' : '28px 32px', marginBottom: 22, color: '#fff', boxShadow: '0 8px 24px rgba(199,0,115,0.18)' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 800 }}>
            {greeting(user?.name)}
          </h1>
          <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 14 }}>
            {todayStr()} · <strong>{info.org_name || 'Your Organisation'}</strong>
          </p>
        </div>

        {/* Onboarding banner */}
        {info.onboarding_status !== 'completed' && (
          <div style={{ background: '#fff9e6', border: '1px solid #f39c12', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#854f0b' }}>
              <BadgeInfo size={22} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Action Required: Complete Onboarding</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Complete your onboarding form to activate all compliance services.</div>
              </div>
            </div>
            <button onClick={() => navigate('/onboarding')} style={{ padding: '8px 16px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Complete Now →
            </button>
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 5}, 1fr)`, gap: 12, marginBottom: 22 }}>
          <KpiCard icon={IndianRupee} label="Total Invoiced"  value={fmt(stats.total_invoiced)} color="#3b8bd4" onClick={() => navigate('/invoices')} />
          <KpiCard icon={CheckCircle} label="Amount Paid"    value={fmt(stats.total_paid)}     color="#2d9d78" onClick={() => navigate('/invoices')} />
          <KpiCard icon={AlertCircle} label="Amount Pending" value={fmt(stats.total_pending)}  color="#e24b4a" sub={`${stats.unpaid_invoices || 0} unpaid`} onClick={() => navigate('/invoices')} />
          <KpiCard icon={FileText}    label="Documents"      value={stats.total_documents || 0} color="#7f77dd" onClick={() => navigate('/documents')} />
          <KpiCard icon={MessageSquare} label="Open Tickets" value={stats.open_tickets || 0}  color="#ef9f27" onClick={() => navigate('/tickets')} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 18 }}>
          {/* Compliance */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #e8e6e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Clock size={17} color="#C70073" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Upcoming Compliances</h3>
            </div>
            {complianceList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbb' }}>
                <CheckCircle size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                All compliances are up to date.
              </div>
            ) : complianceList.map(item => {
              const d = daysUntil(item.due_date);
              const u = urgencyStyle(d);
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#faf9f7', borderRadius: 9, border: '1px solid #f0ede8', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.category}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: u.bg, color: u.color, whiteSpace: 'nowrap' }}>
                    {u.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick services */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #e8e6e0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>⚡ Quick Services</h3>
            {[
              { title: 'Upload Documents', desc: 'Submit monthly statements and registers.', path: '/documents', color: '#7f77dd' },
              { title: 'Raise Support Ticket', desc: 'Query on taxes, GST returns, filings.', path: '/tickets', color: '#ef9f27' },
              { title: 'View Invoices', desc: 'Download receipts and PDF copies.', path: '/invoices', color: '#2d9d78' },
            ].map((a, i) => {
              const [hov, setHov] = useState(false);
              return (
                <div key={i} onClick={() => navigate(a.path)}
                  onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                  style={{ padding: '12px 14px', borderRadius: 9, border: `1px solid ${hov ? a.color + '55' : '#f0ede8'}`, cursor: 'pointer', marginBottom: 10, transition: 'all 0.18s', background: hov ? a.color + '08' : '#faf9f7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{a.title}</div>
                    <ArrowRight size={13} color={hov ? a.color : '#ccc'} />
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{a.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // ADMIN / STAFF DASHBOARD
  // ════════════════════════════════════════
  return (
    <div>

      {/* ── Welcome banner ── */}
      <div style={{ background: 'linear-gradient(135deg,#C70073,#7e0049)', borderRadius: 14, padding: isMobile ? '20px' : '26px 32px', marginBottom: 20, color: '#fff', boxShadow: '0 8px 24px rgba(199,0,115,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 800 }}>{greeting(user?.name)}</h1>
            <p style={{ margin: '5px 0 0', opacity: 0.80, fontSize: 13 }}>{todayStr()}</p>
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.30)', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: '+ New Lead',    path: '/leads',    color: '#3b8bd4' },
          { label: '+ Create Invoice', path: '/invoices', color: '#2d9d78' },
          { label: '+ Add Task',    path: '/tasks',    color: '#534ab7' },
          { label: '+ Add Client',  path: '/clients',  color: '#C70073' },
        ].map(({ label, path, color }) => (
          <button key={label} onClick={() => navigate(path)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: color, border: `1.5px solid ${color}44`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = color; }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 20 }}>
        <KpiCard icon={Users}       label="Active Clients"     value={kpis?.total_clients}      color="#2d9d78" onClick={() => navigate('/clients')} sub="Click to view all" />
        <KpiCard icon={TrendingUp}  label="Active Leads"       value={kpis?.active_leads}        color="#3b8bd4" onClick={() => navigate('/leads')}   sub="In pipeline" />
        <KpiCard icon={AlertCircle} label="Overdue Tasks"      value={kpis?.overdue_tasks}       color="#e24b4a" onClick={() => navigate('/tasks')}    sub="Needs attention" />
        <KpiCard icon={IndianRupee} label="Revenue Collected"  value={fmt(kpis?.collected_revenue)} color="#0f6e56" onClick={() => navigate('/invoices')} sub={`₹${((kpis?.pending_revenue||0)/100000).toFixed(1)}L pending`} />
      </div>

      {/* ── Second KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 20 }}>
        <KpiCard icon={Clock}       label="Overdue Compliance" value={kpis?.overdue_compliance}  color="#e24b4a" onClick={() => navigate('/compliance')} sub="Filing overdue" />
        <KpiCard icon={IndianRupee} label="Revenue Pending"    value={fmt(kpis?.pending_revenue)} color="#ef9f27" onClick={() => navigate('/invoices')} sub="Outstanding invoices" />
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: '#888', fontWeight: 500, marginBottom: 6 }}>SimplyKhata Active</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#00a99d' }}>{kpis?.simplykhata_active || 0} <span style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>FPOs</span></div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: '#888', fontWeight: 500, marginBottom: 6 }}>Mera Hisab Active</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#534ab7' }}>{kpis?.merahisab_active || 0} <span style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>Users</span></div>
        </div>
      </div>

      {/* ── Charts + Compliance + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Pipeline chart */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #e8e6e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={17} color="#2d9d78" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Lead Pipeline</h3>
          </div>
          {pipeline.every(p => p.count === 0) ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>No leads yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipeline} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8f7f4' }} formatter={(v) => [v, 'Leads']} />
                <Bar dataKey="count" radius={[6,6,0,0]} maxBarSize={40}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700 }} />
                  {pipeline.map((p, i) => <Cell key={i} fill={PIPELINE_COLORS[p.status] || '#ccc'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming compliance */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #e8e6e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={17} color="#e24b4a" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Upcoming Deadlines</h3>
            </div>
            <button onClick={() => navigate('/compliance')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#C70073', fontWeight: 600 }}>
              View all →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#bbb' }}>
                <CheckCircle size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                No upcoming deadlines
              </div>
            ) : upcoming.slice(0, 7).map(item => {
              const d = daysUntil(item.due_date);
              const u = urgencyStyle(d);
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#faf9f7', borderRadius: 9, border: `1px solid ${u.bg === '#f8f7f4' ? '#f0ede8' : u.bg}` }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 1 }}>{item.clients?.org_name}</div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: u.bg, color: u.color, marginLeft: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {u.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #e8e6e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={17} color="#534ab7" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Activity</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 220, overflowY: 'auto' }}>
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#bbb' }}>
                <Activity size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                No recent activity
              </div>
            ) : activity.map((a, i) => (
              <div key={a.id || i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < activity.length - 1 ? '1px solid #f8f7f4' : 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C70073' + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#C70073', flexShrink: 0 }}>
                  {a.users?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: '#333', lineHeight: 1.4 }}>
                    <b style={{ color: '#1a1a18' }}>{a.users?.full_name || 'System'}</b>
                    {' '}{ACTION_LABEL[a.action] || a.action}{' '}
                    <span style={{ color: '#555' }}>{a.entity_type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#bbb', marginTop: 2 }}>{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  );
}
