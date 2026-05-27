import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../utils/api';

const COLORS = ['#2d9d78', '#3b8bd4', '#ef9f27', '#534ab7', '#a32d2d', '#888'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [pipelineData, setPipelineData] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: pipeline }, { data: clientsRes }, { data: invoicesRes }] = await Promise.all([
          api.get('/dashboard/pipeline'),
          api.get('/clients?limit=1000'),
          api.get('/invoices?limit=1000')
        ]);

        // Pipeline format
        setPipelineData(pipeline.map(p => ({ name: p.status.replace('_', ' '), count: p.count })));

        // Client Types pie
        const types = {};
        (clientsRes.data || []).forEach(c => {
          const type = c.org_type || 'Unknown';
          types[type] = (types[type] || 0) + 1;
        });
        setClientTypes(Object.keys(types).map(t => ({ name: t, value: types[t] })));

        // Revenue by Month
        const rev = {};
        (invoicesRes.data || []).forEach(inv => {
          if (inv.status !== 'cancelled') {
            const date = new Date(inv.issue_date || inv.created_at);
            const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            rev[month] = (rev[month] || 0) + Number(inv.total_amount || 0);
          }
        });
        // Sort chronologically? Just taking as they come for simplicity or sort if needed
        const revArray = Object.keys(rev).map(k => ({ month: k, revenue: rev[k] }));
        setRevenueData(revArray.reverse()); // rough chronological if DB returned desc
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={{ background: '#fcfcfc', minHeight: '100vh', padding: 20 }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #2d9d78 0%, #157347 100%)',
        borderRadius: 16, padding: '32px', marginBottom: 28, color: '#fff' 
      }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Reports & Analytics</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: 15 }}>Deep insights into your business performance.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading reports data...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Revenue Chart */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e8e6e0' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Revenue Trends</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#2d9d78" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Client Types Chart */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e8e6e0' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Clients by Type</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={clientTypes} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                    {clientTypes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline Chart */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e8e6e0', gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Lead Pipeline</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ textTransform: 'capitalize', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b8bd4" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
