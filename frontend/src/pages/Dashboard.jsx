// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, AlertCircle, IndianRupee, CheckCircle, Clock, FileText, MessageSquare, ArrowRight, BadgeInfo } from 'lucide-react';
import api from '../utils/api';
import useResponsive from '../utils/useResponsive';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PIPELINE_COLORS = { new: '#3b8bd4', contacted: '#ef9f27', qualified: '#2d9d78', proposal_sent: '#7f77dd', converted: '#1d9e75', lost: '#e24b4a' };

function StatCard({ icon: Icon, label, value, color = '#2d9d78', sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === 'client';
  const { isMobile } = useResponsive();

  const [loading, setLoading] = useState(true);

  // Admin states
  const [kpis, setKpis] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  // Client states
  const [clientData, setClientData] = useState(null);

  useEffect(() => {
    if (!user) return;

    if (isClient) {
      api.get('/dashboard/client-summary')
        .then(res => {
          setClientData(res.data);
        })
        .catch(err => {
          console.error('Error loading client dashboard data:', err);
        })
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/pipeline'),
        api.get('/dashboard/upcoming-compliance')
      ]).then(([k, p, u]) => {
        setKpis(k.data.kpis);
        setPipeline(p.data);
        setUpcoming(u.data);
      }).catch(err => {
        console.error('Error loading admin dashboard data:', err);
      }).finally(() => setLoading(false));
    }
  }, [user, isClient]);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading dashboard…</div>;

  if (isClient) {
    const info = clientData?.client || {};
    const stats = clientData?.kpis || {};
    const complianceList = clientData?.compliance || [];

    return (
      <div style={{ background: '#fcfcfc', minHeight: '100vh', padding: isMobile ? 12 : 20 }}>
        {/* Style block for dynamic hover animations */}
        <style>{`
          .dashboard-quick-action { transition: all 0.2s ease-in-out; border: 1px solid #eee; padding: 14px; borderRadius: 12px; cursor: pointer; background: #fcfcfc; }
          .dashboard-quick-action:hover { border-color: #C70073 !important; background: #fffbfd !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(199,0,115,0.06); }
        `}</style>

        {/* Header with Client Welcome */}
        <div style={{ 
          background: 'linear-gradient(135deg, #C70073 0%, #7e0049 100%)',
          borderRadius: 16, padding: isMobile ? '20px' : '32px', marginBottom: isMobile ? 20 : 28, color: '#fff',
          boxShadow: '0 8px 24px rgba(199,0,115,0.18)'
        }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Welcome back, {user?.name || 'Valued Client'}!
          </h1>
          <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: isMobile ? 13 : 15 }}>
            Manage your billing, documents, compliances, and support for <strong>{info.org_name || 'your enterprise'}</strong>.
          </p>
        </div>

        {/* Action Required Banner for Pending Onboarding */}
        {info.onboarding_status !== 'completed' && (
          <div style={{ 
            background: '#fff9e6', border: '1px solid #f39c12', borderRadius: 12, padding: '16px 20px', 
            marginBottom: 28, display: 'flex', flexDirection: isMobile ? 'column' : 'row', 
            alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#854f0b' }}>
              <BadgeInfo size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 14 }}>Action Required: Complete Onboarding</strong>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                  Please complete and sign your business onboarding form to activate all compliance services.
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/onboarding')} 
              style={{ 
                background: '#f39c12', color: '#fff', border: 'none', borderRadius: 8, 
                padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', alignSelf: isMobile ? 'flex-end' : 'center'
              }}
            >
              Complete Now
            </button>
          </div>
        )}

        {/* Client KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
          {[
            { icon: IndianRupee, label: "Total Invoiced", value: fmt(stats.total_invoiced), color: "#3b8bd4" },
            { icon: CheckCircle, label: "Amount Paid", value: fmt(stats.total_paid), color: "#2d9d78" },
            { icon: AlertCircle, label: "Amount Pending", value: fmt(stats.total_pending), color: "#e24b4a", sub: `${stats.unpaid_invoices || 0} unpaid invoices` },
            { icon: FileText, label: "Secure Vault Documents", value: stats.total_documents || 0, color: "#7f77dd", action: () => navigate('/documents'), actionLabel: "View vault" },
            { icon: MessageSquare, label: "Open Support Tickets", value: stats.open_tickets || 0, color: "#ef9f27", action: () => navigate('/tickets'), actionLabel: "View tickets" }
          ].map((stat, i) => (
            <div key={i} style={{ 
              background: '#fff', padding: 20, borderRadius: 16, 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, border: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <stat.icon size={20} color={stat.color} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 2 }}>{stat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a18' }}>{stat.value}</div>
                  {stat.sub && <div style={{ fontSize: 11, color: '#e24b4a', marginTop: 2, fontWeight: 500 }}>{stat.sub}</div>}
                </div>
              </div>
              {stat.action && (
                <button 
                  onClick={stat.action} 
                  style={{ 
                    background: 'none', border: 'none', color: stat.color, padding: 0, 
                    fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', 
                    gap: 4, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 4 
                  }}
                >
                  {stat.actionLabel} <ArrowRight size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 24 }}>
          {/* Compliance Calendar Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e8e6e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#C70073" /> Upcoming Compliances
            </h3>
            {complianceList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>No pending compliance items listed.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee', color: '#888', fontSize: 12 }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px 12px 12px', fontWeight: 600 }}>Compliance Task</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px 12px 12px', fontWeight: 600 }}>Category</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px 12px 12px', fontWeight: 600 }}>Due Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px 12px 12px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceList.map(item => {
                      const isOverdue = new Date(item.due_date) < new Date() && item.status !== 'completed';
                      let statusBg = '#eaf3de', statusColor = '#3b6d11', statusText = 'Completed';
                      if (item.status === 'pending' || item.status === 'in_progress') {
                        statusBg = isOverdue ? '#fcebeb' : '#faeeda';
                        statusColor = isOverdue ? '#a32d2d' : '#854f0b';
                        statusText = isOverdue ? 'Overdue' : item.status === 'in_progress' ? 'In Progress' : 'Pending';
                      }

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                          <td style={{ padding: '12px', fontWeight: 500, color: '#222' }}>{item.title}</td>
                          <td style={{ padding: '12px', color: '#666', textTransform: 'uppercase', fontSize: 11, fontWeight: 500 }}>{item.category}</td>
                          <td style={{ padding: '12px', color: '#555' }}>
                            {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: statusBg, color: statusColor, fontWeight: 600 }}>
                              {statusText}
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

          {/* Quick Actions Panel */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e8e6e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>
              ⚡ Quick Services
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { title: "Upload Invoices / Bank Statements", desc: "Submit monthly registers and statements.", path: "/documents" },
                { title: "Raise Support Ticket", desc: "Query regarding taxes or GST returns.", path: "/tickets" },
                { title: "View Invoices & Billing", desc: "Download receipt copies and PDFs.", path: "/invoices" }
              ].map((action, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(action.path)}
                  className="dashboard-quick-action"
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {action.title}
                    <ArrowRight size={14} color="#888" />
                  </div>
                  <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{action.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div style={{ background: '#fcfcfc', minHeight: '100vh', padding: isMobile ? 12 : 20 }}>
      {/* Header with Gradient */}
      <div style={{ 
        background: 'linear-gradient(135deg, #C70073 0%, #7e0049 100%)',
        borderRadius: 16, padding: isMobile ? '20px' : '32px', marginBottom: isMobile ? 20 : 28, color: '#fff',
        boxShadow: '0 8px 24px rgba(199,0,115,0.18)'
      }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.5px' }}>Dashboard</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: isMobile ? 13 : 15 }}>Monitor your practice performance at a glance.</p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { icon: Users, label: "Active Clients", value: kpis?.total_clients, color: "#2d9d78" },
          { icon: TrendingUp, label: "Active Leads", value: kpis?.active_leads, color: "#3b8bd4" },
          { icon: AlertCircle, label: "Overdue Tasks", value: kpis?.overdue_tasks, color: "#e24b4a" },
          { icon: IndianRupee, label: "Revenue (Coll.)", value: fmt(kpis?.collected_revenue), color: "#0f6e56" }
        ].map((stat, i) => (
          <div key={i} style={{ 
            background: '#fff', padding: 20, borderRadius: 16, 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #f0f0f0'
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={22} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 2 }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a18' }}>{stat.value || 0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Merum SaaS Distribution Card */}
      <div style={{ 
        background: '#fff', padding: isMobile ? '16px' : '20px 24px', borderRadius: 16, 
        border: '1px solid #e8e6e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: 28, display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between',
        gap: 20
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#C70073' }}>
            🌾 Rural Enterprise Active SaaS Deployments
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
            Tracking cloud solutions enabled for your social businesses and Farmer Producer Organizations.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fcfcfc', border: '1px solid #f0f0f0', padding: '10px 20px', borderRadius: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C70073' }} />
            <div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>SimplyKhata Active</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>{kpis?.simplykhata_active || 0} FPOs</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fcfcfc', border: '1px solid #f0f0f0', padding: '10px 20px', borderRadius: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2d9d78' }} />
            <div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>Mera Hisab Active</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>{kpis?.merahisab_active || 0} Users</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
        {/* Pipeline Chart */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e8e6e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#2d9d78" /> Pipeline Overview
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8f8f8'}} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {pipeline.map((entry, i) => (
                  <Cell key={i} fill={PIPELINE_COLORS[entry.status] || '#ccc'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Compliance */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e8e6e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="#e24b4a" /> Upcoming Deadlines
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>No pending deadlines</div>
            ) : upcoming.slice(0, 5).map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fcfcfc', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{item.clients?.org_name}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: '#f0f0f0', color: '#555' }}>
                  {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

