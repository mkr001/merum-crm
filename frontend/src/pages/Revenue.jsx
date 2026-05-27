// src/pages/Revenue.jsx — Revenue & Collections Tracker
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { IndianRupee, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../utils/api';

const COLORS = ['#2d9d78', '#3b8bd4', '#ef9f27', '#e24b4a', '#534ab7', '#888'];

function KpiCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a18' }}>{value}</div>
      </div>
    </div>
  );
}

export default function Revenue() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invoices?limit=500').then(r => setInvoices(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  // KPIs
  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  // Monthly revenue chart
  const monthlyMap = {};
  invoices.forEach(inv => {
    const d = new Date(inv.issue_date || inv.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, billed: 0, collected: 0 };
    monthlyMap[key].billed += Number(inv.total_amount || 0);
    if (inv.status === 'paid') monthlyMap[key].collected += Number(inv.total_amount || 0);
  });
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

  // Status breakdown for pie
  const statusMap = {};
  invoices.forEach(inv => {
    const st = inv.status || 'draft';
    statusMap[st] = (statusMap[st] || 0) + Number(inv.total_amount || 0);
  });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Top clients by revenue
  const clientMap = {};
  invoices.forEach(inv => {
    const name = inv.clients?.org_name || 'Unknown';
    clientMap[name] = (clientMap[name] || 0) + Number(inv.total_amount || 0);
  });
  const topClients = Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18', marginBottom: 20 }}>Revenue & Collections</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20, height: 70 }}>
              <div style={{ height: 12, width: '40%', background: '#f5f5f5', borderRadius: 4, marginBottom: 10 }} />
              <div style={{ height: 20, width: '60%', background: '#f5f5f5', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Revenue & Collections</h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard icon={IndianRupee} label="Total Billed" value={fmt(totalRevenue)} color="#2d9d78" bg="#e1f5ee" />
        <KpiCard icon={CheckCircle} label="Collected" value={fmt(collected)} color="#3b8bd4" bg="#e6f1fb" />
        <KpiCard icon={TrendingUp} label="Outstanding" value={fmt(outstanding)} color="#ef9f27" bg="#faeeda" />
        <KpiCard icon={AlertTriangle} label="Overdue Invoices" value={overdueCount} color="#e24b4a" bg="#fcebeb" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Monthly Billed vs Collected */}
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Monthly Billed vs Collected</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="billed" fill="#2d9d78" radius={[4, 4, 0, 0]} name="Billed" />
              <Bar dataKey="collected" fill="#3b8bd4" radius={[4, 4, 0, 0]} name="Collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Invoice Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Clients */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Top Clients by Revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topClients} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
            <Tooltip formatter={v => fmt(v)} />
            <Bar dataKey="value" fill="#534ab7" radius={[0, 4, 4, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
