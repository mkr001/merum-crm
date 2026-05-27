// src/pages/Workload.jsx — Team Workload View
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';
import api from '../utils/api';

const COLORS = ['#2d9d78', '#3b8bd4', '#ef9f27', '#e24b4a', '#534ab7', '#888', '#0f6e56', '#854f0b'];

export default function Workload() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [{ data: uData }, { data: tData }, { data: cData }] = await Promise.all([
          api.get('/users'),
          api.get('/tasks'),
          api.get('/compliance')
        ]);
        setUsers(uData.data || []);
        setTasks(tData.data || []);
        setCompliance(cData.data || []);
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  // Build workload per user
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = { name: u.full_name, open_tasks: 0, completed_tasks: 0, pending_compliance: 0, total: 0 };
  });
  tasks.forEach(t => {
    if (t.assigned_to && userMap[t.assigned_to]) {
      if (t.status === 'completed') userMap[t.assigned_to].completed_tasks++;
      else userMap[t.assigned_to].open_tasks++;
      userMap[t.assigned_to].total++;
    }
  });
  compliance.forEach(c => {
    if (c.assigned_to && userMap[c.assigned_to]) {
      if (c.status !== 'completed') userMap[c.assigned_to].pending_compliance++;
      userMap[c.assigned_to].total++;
    }
  });

  const workloadData = Object.values(userMap).filter(u => u.total > 0).sort((a, b) => b.total - a.total);
  const chartData = workloadData.map(u => ({ name: u.name, 'Open Tasks': u.open_tasks, 'Completed': u.completed_tasks, 'Pending Compliance': u.pending_compliance }));

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18', marginBottom: 20 }}>Team Workload</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20, height: 120 }}>
              <div style={{ height: 14, width: '50%', background: '#f5f5f5', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 10, width: '80%', background: '#f5f5f5', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 10, width: '60%', background: '#f5f5f5', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Team Workload</h1>

      {/* Stacked Bar Chart */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Workload Distribution</h3>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No assigned work found</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Open Tasks" stackId="a" fill="#ef9f27" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Completed" stackId="a" fill="#2d9d78" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pending Compliance" stackId="a" fill="#e24b4a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Individual Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {workloadData.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#aaa' }}>
            <Users size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
            No work assignments found
          </div>
        ) : workloadData.map((u, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS[i % COLORS.length] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: COLORS[i % COLORS.length] }}>
                {u.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a18' }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{u.total} total items</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ background: '#faeeda', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#854f0b' }}>{u.open_tasks}</div>
                <div style={{ fontSize: 10, color: '#854f0b' }}>Open</div>
              </div>
              <div style={{ background: '#eaf3de', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#3b6d11' }}>{u.completed_tasks}</div>
                <div style={{ fontSize: 10, color: '#3b6d11' }}>Done</div>
              </div>
              <div style={{ background: '#fcebeb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#a32d2d' }}>{u.pending_compliance}</div>
                <div style={{ fontSize: 10, color: '#a32d2d' }}>Compliance</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
