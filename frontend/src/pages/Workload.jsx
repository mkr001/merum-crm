// src/pages/Workload.jsx — Team Workload View
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, CartesianGrid } from 'recharts';
import { Users, CheckSquare, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#2d9d78','#3b8bd4','#ef9f27','#e24b4a','#534ab7','#C70073','#0891b2','#7c3aed'];

function StatBadge({ label, value, color, bg }) {
  return (
    <div style={{ textAlign:'center', padding:'12px 10px', borderRadius:10, background:bg }}>
      <div style={{ fontSize:20, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:10, color, marginTop:3, fontWeight:600 }}>{label}</div>
    </div>
  );
}

export default function Workload() {
  const [users, setUsers]           = useState([]);
  const [tasks, setTasks]           = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: uData }, { data: tData }, { data: cData }] = await Promise.all([
          api.get('/users'),
          api.get('/tasks?limit=500'),
          api.get('/compliance?limit=500'),
        ]);
        setUsers(uData.data || []);
        setTasks(tData.data || []);
        setCompliance(cData.data || []);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load workload data.');
        toast.error('Failed to load workload data.');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Build per-user workload map ──────────────────────────────
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = {
      name: u.full_name, role: u.roles?.name || '',
      open_tasks: 0, overdue_tasks: 0, completed_tasks: 0,
      pending_compliance: 0, overdue_compliance: 0,
    };
  });

  const today = new Date().toISOString().split('T')[0];
  tasks.forEach(t => {
    if (!t.assigned_to || !userMap[t.assigned_to]) return;
    const u = userMap[t.assigned_to];
    if (t.status === 'completed') { u.completed_tasks++; }
    else {
      u.open_tasks++;
      if (t.due_date && t.due_date < today) u.overdue_tasks++;
    }
  });
  compliance.forEach(c => {
    if (!c.assigned_to || !userMap[c.assigned_to]) return;
    const u = userMap[c.assigned_to];
    if (c.status !== 'completed' && c.status !== 'filed') {
      u.pending_compliance++;
      if (c.due_date && c.due_date < today) u.overdue_compliance++;
    }
  });

  const workloadData = Object.values(userMap)
    .map(u => ({ ...u, total: u.open_tasks + u.completed_tasks + u.pending_compliance }))
    .filter(u => u.total > 0)
    .sort((a, b) => (b.open_tasks + b.pending_compliance) - (a.open_tasks + a.pending_compliance));

  const chartData = workloadData.map(u => ({
    name: u.name?.split(' ')[0],
    'Open Tasks':        u.open_tasks,
    'Done':              u.completed_tasks,
    'Compliance':        u.pending_compliance,
  }));

  // ── Team summary stats ───────────────────────────────────────
  const totalOpen       = workloadData.reduce((s, u) => s + u.open_tasks, 0);
  const totalDone       = workloadData.reduce((s, u) => s + u.completed_tasks, 0);
  const totalOverdue    = workloadData.reduce((s, u) => s + u.overdue_tasks + u.overdue_compliance, 0);
  const totalCompliance = workloadData.reduce((s, u) => s + u.pending_compliance, 0);
  const completionRate  = (totalOpen + totalDone) > 0 ? Math.round((totalDone / (totalOpen + totalDone)) * 100) : 0;

  if (loading) return (
    <div>
      <div style={{ height:80, background:'linear-gradient(90deg,#f8f7f4 25%,#eeece8 50%,#f8f7f4 75%)',
        backgroundSize:'200% 100%', borderRadius:14, marginBottom:18, animation:'shimmer 1.4s infinite' }} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
        {[...Array(6)].map((_,i) => (
          <div key={i} style={{ height:140, background:'linear-gradient(90deg,#f8f7f4 25%,#eeece8 50%,#f8f7f4 75%)',
            backgroundSize:'200% 100%', borderRadius:12, animation:'shimmer 1.4s infinite' }} />
        ))}
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
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
      <div style={{ background:'linear-gradient(135deg,#534ab7,#3730a3)', borderRadius:14, padding:'22px 28px', marginBottom:20, color:'#fff' }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>Team Workload</h1>
        <p style={{ margin:'5px 0 0', opacity:0.75, fontSize:13 }}>Task & compliance distribution across {workloadData.length} team members.</p>
      </div>

      {/* Summary row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Open Tasks',   value:totalOpen,       color:'#854f0b', bg:'#faeeda', icon:Clock        },
          { label:'Completed',    value:totalDone,        color:'#3b6d11', bg:'#eaf3de', icon:CheckSquare  },
          { label:'Overdue',      value:totalOverdue,     color:'#a32d2d', bg:'#fcebeb', icon:AlertTriangle },
          { label:'Compliance',   value:totalCompliance,  color:'#534ab7', bg:'#eeedfe', icon:Users        },
          { label:'Completion %', value:`${completionRate}%`, color:'#2d9d78', bg:'#e1f5ee', icon:TrendingUp },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #e8e6e0', borderRadius:12, padding:'14px 16px',
            display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:'#1a1a18' }}>{value}</div>
              <div style={{ fontSize:10, color:'#888', fontWeight:500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background:'#fff', border:'1px solid #e8e6e0', borderRadius:14, padding:'20px 22px', marginBottom:20 }}>
        <h3 style={{ margin:'0 0 4px', fontSize:15, fontWeight:700, color:'#1a1a18' }}>Workload Distribution</h3>
        <p style={{ margin:'0 0 16px', fontSize:12, color:'#aaa' }}>Stacked view of open tasks, completed, and compliance items per person</p>
        {chartData.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'#aaa' }}>No assignments found</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top:4, right:16, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize:11 }} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize:11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Open Tasks"  stackId="a" fill="#ef9f27" />
              <Bar dataKey="Done"        stackId="a" fill="#2d9d78" />
              <Bar dataKey="Compliance"  stackId="a" fill="#e24b4a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-member cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {workloadData.length === 0 ? (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'#aaa' }}>
            <Users size={36} style={{ margin:'0 auto 10px', display:'block', opacity:0.3 }} />
            <p style={{ margin:0 }}>No work assignments found</p>
          </div>
        ) : workloadData.map((u, i) => {
          const done  = u.completed_tasks;
          const total = u.open_tasks + u.completed_tasks;
          const rate  = total > 0 ? Math.round((done / total) * 100) : 0;
          const hasOverdue = (u.overdue_tasks + u.overdue_compliance) > 0;

          return (
            <div key={i} style={{ background:'#fff', border:`1px solid ${hasOverdue ? '#f5c6c6' : '#e8e6e0'}`,
              borderRadius:12, padding:'18px 20px' }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
                  background: COLORS[i % COLORS.length] + '22',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:15, color: COLORS[i % COLORS.length] }}>
                  {u.name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#1a1a18', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize:11, color:'#888', textTransform:'capitalize' }}>{u.role}</div>
                </div>
                {hasOverdue && (
                  <span style={{ fontSize:10, padding:'3px 8px', borderRadius:10, background:'#fcebeb', color:'#a32d2d', fontWeight:600, whiteSpace:'nowrap' }}>
                    {u.overdue_tasks + u.overdue_compliance} overdue
                  </span>
                )}
              </div>

              {/* Stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                <StatBadge label="Open"       value={u.open_tasks}        color="#854f0b" bg="#faeeda" />
                <StatBadge label="Done"       value={u.completed_tasks}   color="#3b6d11" bg="#eaf3de" />
                <StatBadge label="Compliance" value={u.pending_compliance} color="#534ab7" bg="#eeedfe" />
              </div>

              {/* Completion bar */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#888', marginBottom:5 }}>
                  <span>Task completion</span>
                  <span style={{ fontWeight:600, color: rate >= 70 ? '#2d9d78' : '#854f0b' }}>{rate}%</span>
                </div>
                <div style={{ height:6, background:'#f0ede8', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ width:`${rate}%`, height:'100%', borderRadius:10,
                    background: rate >= 70 ? '#2d9d78' : rate >= 40 ? '#ef9f27' : '#e24b4a',
                    transition:'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
