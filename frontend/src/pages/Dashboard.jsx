// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, AlertCircle, IndianRupee, CheckCircle, Clock } from 'lucide-react';
import api from '../utils/api';

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
  const [kpis, setKpis] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/dashboard/pipeline'),
      api.get('/dashboard/upcoming-compliance')
    ]).then(([k, p, u]) => {
      setKpis(k.data.kpis);
      setPipeline(p.data);
      setUpcoming(u.data);
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading dashboard…</div>;

  return (
    <div style={{ background: '#fcfcfc', minHeight: '100vh', padding: 20 }}>
      {/* Header with Gradient */}
      <div style={{ 
        background: 'linear-gradient(135deg, #C70073 0%, #7e0049 100%)',
        borderRadius: 16, padding: '32px', marginBottom: 28, color: '#fff',
        boxShadow: '0 8px 24px rgba(199,0,115,0.18)'
      }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>Dashboard</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: 15 }}>Monitor your practice performance at a glance.</p>
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
        background: '#fff', padding: '20px 24px', borderRadius: 16, 
        border: '1px solid #e8e6e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#C70073' }}>
            🌾 Rural Enterprise Active SaaS Deployments
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
            Tracking cloud solutions enabled for your social businesses and Farmer Producer Organizations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
