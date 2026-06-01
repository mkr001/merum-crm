// src/pages/Reports.jsx
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { FileText, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import useResponsive from '../utils/useResponsive';

const COLORS = ['#2d9d78','#3b8bd4','#ef9f27','#534ab7','#e24b4a','#C70073','#0891b2','#7c3aed'];

function StatCard({ icon: Icon, label, value, color, bg, sub }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e8e6e0', borderRadius:12, padding:'18px 20px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:44, height:44, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#1a1a18' }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children, span }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e8e6e0', borderRadius:14, padding:'20px 22px', gridColumn: span === 2 ? '1 / -1' : undefined }}>
      <div style={{ marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#1a1a18' }}>{title}</h3>
        {sub && <p style={{ margin:'3px 0 0', fontSize:12, color:'#aaa' }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Reports() {
  const { isMobile } = useResponsive();
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [revenueData, setRevenueData]     = useState([]);
  const [pipelineData, setPipelineData]   = useState([]);
  const [clientTypes, setClientTypes]     = useState([]);
  const [invoiceStatus, setInvoiceStatus] = useState([]);
  const [complianceStats, setComplianceStats] = useState([]);
  const [topClients, setTopClients]       = useState([]);
  const [kpis, setKpis]                   = useState({ totalRevenue:0, collected:0, totalClients:0, overdueCount:0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [pipeRes, clientsRes, invoicesRes, complianceRes] = await Promise.all([
          api.get('/dashboard/pipeline'),
          api.get('/clients?limit=500'),
          api.get('/invoices?limit=500'),
          api.get('/compliance?limit=500'),
        ]);

        const clients  = clientsRes.data.data  || [];
        const invoices = invoicesRes.data.data  || [];
        const pipeline = pipeRes.data           || [];
        const compliance = complianceRes.data.data || [];

        // ── KPIs ──
        const totalRevenue = invoices.filter(i => i.status !== 'cancelled').reduce((s,i) => s + Number(i.total_amount||0), 0);
        const collected    = invoices.filter(i => i.status === 'paid').reduce((s,i) => s + Number(i.total_amount||0), 0);
        const overdueCount = invoices.filter(i => i.status === 'overdue').length;
        setKpis({ totalRevenue, collected, totalClients: clients.length, overdueCount });

        // ── Revenue by month (last 12) ──
        const rev = {};
        invoices.forEach(inv => {
          if (inv.status === 'cancelled') return;
          const d = new Date(inv.issue_date || inv.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const label = d.toLocaleString('default', { month: 'short', year:'2-digit' });
          if (!rev[key]) rev[key] = { month: label, billed:0, collected:0 };
          rev[key].billed += Number(inv.total_amount||0);
          if (inv.status === 'paid') rev[key].collected += Number(inv.total_amount||0);
        });
        setRevenueData(Object.entries(rev).sort(([a],[b]) => a.localeCompare(b)).slice(-12).map(([,v]) => v));

        // ── Pipeline ──
        setPipelineData(pipeline.map(p => ({ name: p.status?.replace(/_/g,' '), count: Number(p.count) })));

        // ── Client types pie ──
        const types = {};
        clients.forEach(c => { const t = c.org_type || 'Unknown'; types[t] = (types[t]||0) + 1; });
        setClientTypes(Object.entries(types).map(([name, value]) => ({ name, value })));

        // ── Invoice status pie ──
        const statMap = {};
        invoices.forEach(i => { const s = i.status||'draft'; statMap[s] = (statMap[s]||0)+1; });
        setInvoiceStatus(Object.entries(statMap).map(([name,value]) => ({ name, value })));

        // ── Compliance by status ──
        const cMap = {};
        compliance.forEach(c => { const s = c.status||'pending'; cMap[s] = (cMap[s]||0)+1; });
        setComplianceStats(Object.entries(cMap).map(([name,value]) => ({ name, value })));

        // ── Top 5 clients by revenue ──
        const clientRev = {};
        invoices.filter(i => i.status === 'paid').forEach(i => {
          const name = i.clients?.org_name || 'Unknown';
          clientRev[name] = (clientRev[name]||0) + Number(i.total_amount||0);
        });
        setTopClients(
          Object.entries(clientRev)
            .sort(([,a],[,b]) => b-a)
            .slice(0,5)
            .map(([name, revenue]) => ({ name, revenue }))
        );
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmt = (n) => '₹' + Number(n||0).toLocaleString('en-IN');
  const collectionRate = kpis.totalRevenue > 0 ? Math.round((kpis.collected / kpis.totalRevenue) * 100) : 0;

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {[...Array(4)].map((_,i) => (
        <div key={i} style={{ height:160, background:'#fff', border:'1px solid #e8e6e0', borderRadius:14,
          background:'linear-gradient(90deg,#f8f7f4 25%,#eeece8 50%,#f8f7f4 75%)', backgroundSize:'200% 100%',
          animation:'shimmer 1.4s infinite' }} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding:40, textAlign:'center', color:'#a32d2d', background:'#fcebeb', borderRadius:14, border:'1px solid #f5c6c6' }}>
      ⚠️ {error}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#2d9d78,#157347)', borderRadius:14, padding:'24px 28px', marginBottom:22, color:'#fff' }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>Reports & Analytics</h1>
        <p style={{ margin:'5px 0 0', opacity:0.8, fontSize:13 }}>Business performance across clients, revenue and compliance.</p>
      </div>

      {/* KPI row */}
      <div className="res-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
        <StatCard icon={TrendingUp} label="Total Billed"    value={fmt(kpis.totalRevenue)} color="#2d9d78" bg="#eaf3de" />
        <StatCard icon={FileText}   label="Collected"       value={fmt(kpis.collected)}    color="#3b8bd4" bg="#e1effe" sub={`${collectionRate}% collection rate`} />
        <StatCard icon={Users}      label="Total Clients"   value={kpis.totalClients}      color="#534ab7" bg="#eeedfe" />
        <StatCard icon={AlertTriangle} label="Overdue Invoices" value={kpis.overdueCount}  color="#e24b4a" bg="#fcebeb" />
      </div>

      {/* Charts grid */}
      <div className="res-grid-2" style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16 }}>

        {/* Revenue Trends — full width */}
        <ChartCard title="Revenue Trends" sub="Monthly billed vs collected (last 12 months)" span={2}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData} margin={{ top:4, right:16, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize:11 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} style={{ fontSize:11 }} />
              <Tooltip formatter={v => [fmt(v)]} />
              <Legend />
              <Bar dataKey="billed"    name="Billed"    fill="#3b8bd4" radius={[4,4,0,0]} />
              <Bar dataKey="collected" name="Collected" fill="#2d9d78" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top clients */}
        <ChartCard title="Top 5 Clients by Revenue" sub="Based on paid invoices">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topClients} layout="vertical" margin={{ left:8, right:16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0ede8" />
              <XAxis type="number" tickFormatter={v => `₹${v/1000}k`} axisLine={false} tickLine={false} style={{ fontSize:11 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} style={{ fontSize:11 }} />
              <Tooltip formatter={v => [fmt(v), 'Revenue']} />
              <Bar dataKey="revenue" fill="#C70073" radius={[0,4,4,0]}>
                {topClients.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Lead Pipeline */}
        <ChartCard title="Lead Pipeline" sub="Leads by status">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineData} layout="vertical" margin={{ left:20, right:16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0ede8" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize:11, textTransform:'capitalize' }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0,4,4,0]}>
                {pipelineData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Client types pie */}
        <ChartCard title="Clients by Type" sub="Organisation type breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={clientTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {clientTypes.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Invoice status pie */}
        <ChartCard title="Invoice Status Distribution" sub="Count of invoices per status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={invoiceStatus} cx="50%" cy="50%" outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                {invoiceStatus.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Compliance status */}
        <ChartCard title="Compliance Status" sub="Items by filing status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={complianceStats} cx="50%" cy="50%" outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                {complianceStats.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
