// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      toast.error('Invalid email or password');
    } finally { setLoading(false); }
  };

  const features = [
    { icon: '👥', title: '360° Client View',        desc: 'Get complete insights and build stronger connections.' },
    { icon: '🤝', title: 'Smarter Deal Management', desc: 'Track pipeline, close more deals, and grow revenue.'   },
    { icon: '✅', title: 'Task Automation',          desc: 'Automate workflows and save time on repetitive tasks.' },
    { icon: '📊', title: 'Powerful Analytics',       desc: 'Make data-driven decisions with real-time reports.'    },
  ];

  const stats = [
    { emoji: '👥', value: '100+',  label: 'Happy Clients'   },
    { emoji: '📈', value: '₹1Cr+', label: 'Revenue Managed' },
    { emoji: '🛡️', value: '99.9%', label: 'Uptime'          },
    { emoji: '⭐', value: '5+',    label: 'Years of Impact'  },
  ];

  /* ── reusable floating glass card ── */
  const GCard = ({ children, style }) => (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 16, padding: '14px 18px', color: '#fff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
      ...style,
    }}>
      {children}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }

        .login-root {
          min-height: 100vh; display: flex;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ══ LEFT PANEL ══ */
        .ll {
          flex: 0 0 58%; min-height: 100vh;
          position: relative; overflow: hidden;
          display: flex; flex-direction: column;
          padding: 36px 44px 30px;
          background:
            radial-gradient(ellipse 80% 70% at 85% 10%,  rgba(120,40,220,0.40) 0%, transparent 55%),
            radial-gradient(ellipse 60% 80% at 10% 90%,  rgba(30, 60,200,0.28) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 50% 50%,  rgba(80,  0,140,0.18) 0%, transparent 70%),
            linear-gradient(155deg, #060014 0%, #0f0030 30%, #1a0050 60%, #07001a 100%);
        }
        /* subtle grid */
        .ll::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(255,255,255,0.020) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,0.020) 1px,transparent 1px);
          background-size: 58px 58px;
        }
        /* bottom wave */
        .ll-wave {
          position:absolute; bottom:0; left:0; right:0; height:140px; pointer-events:none;
          background: linear-gradient(0deg, rgba(100,40,200,0.22) 0%, transparent 100%);
        }

        /* inner split: text col | cards col */
        .ll-body {
          display: flex; gap: 0; flex: 1;
          position: relative; z-index: 2;
        }
        .ll-text { flex: 0 0 52%; display: flex; flex-direction: column; justify-content: center; padding-right: 24px; }
        .ll-cards { flex: 1; position: relative; }

        /* ══ RIGHT PANEL ══ */
        .rr {
          flex: 1; background: #05000f;
          display: flex; align-items: center; justify-content: center;
          padding: 28px 20px;
        }
        .rr-card {
          width: 100%; max-width: 430px;
          background: #fff; border-radius: 22px;
          padding: 30px 34px 26px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.60);
          animation: fadeUp .45s ease both;
        }

        /* inputs */
        .mrm-in {
          width:100%; padding:11px 14px 11px 42px;
          border:1.5px solid #e8e5e0; border-radius:10px;
          font-size:14px; font-family:inherit; outline:none;
          background:#faf9f7; color:#1a1a18;
          transition: border-color .18s, box-shadow .18s;
        }
        .mrm-in:focus { border-color:#C70073; background:#fff; box-shadow:0 0 0 3.5px rgba(199,0,115,0.11); }

        /* buttons */
        .mrm-btn {
          width:100%; padding:13px;
          background: linear-gradient(135deg,#C70073 0%,#9b0059 50%,#6e003e 100%);
          color:#fff; border:none; border-radius:11px;
          font-size:15px; font-weight:700; font-family:inherit;
          cursor:pointer; letter-spacing:.2px;
          box-shadow:0 6px 24px rgba(199,0,115,0.38);
          transition:all .18s; display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .mrm-btn:hover:not(:disabled) { opacity:.91; transform:translateY(-1px); box-shadow:0 10px 30px rgba(199,0,115,.44); }
        .mrm-btn:disabled { background:#e5e7eb; color:#9ca3af; box-shadow:none; cursor:not-allowed; }

        .mrm-goog {
          width:100%; padding:11px;
          background:#fff; color:#374151;
          border:1.5px solid #e8e5e0; border-radius:11px;
          font-size:14px; font-weight:600; font-family:inherit; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:10px;
          transition:border-color .15s, box-shadow .15s;
        }
        .mrm-goog:hover { border-color:#c5c0ba; box-shadow:0 2px 8px rgba(0,0,0,.08); }

        @media(max-width:900px){
          .ll { display:none!important; }
          .rr { background:#fff; }
          .rr-card { box-shadow:none; border-radius:0; padding:32px 20px; }
        }
      `}</style>

      <div className="login-root">

        {/* ══════════════ LEFT PANEL ══════════════ */}
        <div className="ll">
          <div className="ll-wave" />

          {/* ── Top: logo row ── */}
          <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <img src="/logo.png" alt="Merum"
              style={{ height:44, objectFit:'contain', filter:'brightness(0) invert(1)' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
            />
            <div style={{ display:'none', fontSize:20, fontWeight:800, color:'#fff' }}>Merum</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', letterSpacing:.2 }}>Merum CRM</div>
              <div style={{ fontSize:10.5, color:'rgba(255,255,255,.40)' }}>Stronger Relationships. Better Business.</div>
            </div>
          </div>

          {/* ── Inner split body ── */}
          <div className="ll-body">

            {/* LEFT text column */}
            <div className="ll-text">

              {/* Badge */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, width:'fit-content',
                background:'rgba(199,0,115,0.18)', border:'1px solid rgba(199,0,115,0.40)',
                borderRadius:20, padding:'4px 13px', marginBottom:20 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#C70073',
                  display:'inline-block', boxShadow:'0 0 8px #C70073', animation:'pulse 2s infinite' }} />
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:1.4, textTransform:'uppercase', color:'#ff6db8' }}>
                  CRM Platform · Client Connect
                </span>
              </div>

              {/* Headline */}
              <h2 style={{ fontSize:32, fontWeight:900, color:'#fff', lineHeight:1.2, letterSpacing:-0.7, marginBottom:12 }}>
                Build stronger<br />
                <span style={{ color:'#C70073' }}>client relationships.</span><br />
                Grow your business.
              </h2>

              <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', lineHeight:1.7, marginBottom:24 }}>
                Merum CRM is your all-in-one platform to manage clients,
                close deals, automate tasks, and build lasting relationships.
              </p>

              {/* Features */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {features.map(({ icon, title, desc }) => (
                  <div key={title} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9, flexShrink:0,
                      background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.10)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:1 }}>{title}</div>
                      <div style={{ fontSize:11.5, color:'rgba(255,255,255,.40)', lineHeight:1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT cards column */}
            <div className="ll-cards">

              {/* Card: New Deal Closed — top */}
              <GCard style={{ top:0, right:0, minWidth:190, animation:'floatA 4s ease-in-out infinite', position:'absolute' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:'rgba(139,92,246,.40)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📈</div>
                  <span style={{ fontSize:12.5, fontWeight:600, opacity:.9 }}>New Deal Closed</span>
                </div>
                <div style={{ fontSize:22, fontWeight:800, marginBottom:5 }}>₹3,45,000</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:10, opacity:.55 }}>This Week</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#4ade80',
                    background:'rgba(74,222,128,.18)', padding:'2px 8px', borderRadius:10 }}>▲ +24%</span>
                </div>
              </GCard>

              {/* Card: Client Meeting — middle left of cards col */}
              <GCard style={{ top:'28%', left:0, minWidth:200, animation:'floatB 5s ease-in-out infinite', position:'absolute' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:'rgba(59,130,246,.35)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>📅</div>
                  <span style={{ fontSize:12.5, fontWeight:600, opacity:.9 }}>Client Meeting</span>
                </div>
                <div style={{ fontSize:11.5, opacity:.60, marginBottom:9 }}>Tomorrow, 11:00 AM</div>
                <div style={{ display:'flex', alignItems:'center' }}>
                  {['#C70073','#3b82f6','#2d9d78'].map((c,i) => (
                    <div key={i} style={{ width:24, height:24, borderRadius:'50%', background:c,
                      border:'2px solid rgba(255,255,255,.30)', marginLeft: i > 0 ? -6 : 0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, color:'#fff', fontWeight:700 }}>
                      {['A','S','M'][i]}
                    </div>
                  ))}
                  <span style={{ fontSize:11, opacity:.60, marginLeft:10 }}>+2</span>
                </div>
              </GCard>

              {/* Card: Invoice Paid — middle right */}
              <GCard style={{ top:'28%', right:0, minWidth:165, animation:'floatA 6s ease-in-out infinite .5s', position:'absolute' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'#22c55e',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>✓</div>
                  <span style={{ fontSize:12.5, fontWeight:600 }}>Invoice Paid</span>
                </div>
                <div style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>₹75,000</div>
                <div style={{ fontSize:10.5, opacity:.55 }}>View Details →</div>
              </GCard>

              {/* Card: Tasks — bottom */}
              <GCard style={{ bottom:'10%', right:10, minWidth:195, animation:'floatB 4.5s ease-in-out infinite 1s', position:'absolute' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
                  <span style={{ fontSize:12.5, fontWeight:600 }}>Tasks Completed</span>
                  <span style={{ fontSize:20, fontWeight:800, color:'#a78bfa' }}>85%</span>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,.15)', borderRadius:10, overflow:'hidden', marginBottom:6 }}>
                  <div style={{ width:'85%', height:'100%', borderRadius:10,
                    background:'linear-gradient(90deg,#a78bfa,#7c3aed)' }} />
                </div>
                <div style={{ fontSize:10.5, opacity:.58 }}>12 / 14 Tasks</div>
              </GCard>

            </div>
          </div>

          {/* ── Bottom stats ── */}
          <div style={{ position:'relative', zIndex:2, marginTop:24 }}>
            <div style={{ display:'flex', gap:0, borderRadius:14, overflow:'hidden',
              border:'1px solid rgba(255,255,255,.08)', marginBottom:14 }}>
              {stats.map(({ emoji, value, label }, i) => (
                <div key={label} style={{ flex:1, textAlign:'center', padding:'12px 6px',
                  background:'rgba(255,255,255,.04)',
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,.08)' : 'none' }}>
                  <div style={{ fontSize:11, marginBottom:2 }}>{emoji}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'#C70073', lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:9.5, color:'rgba(255,255,255,.36)', marginTop:3, fontWeight:500 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Trust badge */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, marginBottom:12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.32)', fontWeight:500 }}>
                Trusted by growing businesses worldwide
              </span>
            </div>

            {/* Product logos */}
            <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
              {/* SimplyKhata */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:20, height:20, borderRadius:4, flexShrink:0,
                  background:'linear-gradient(135deg,#00a99d,#003459)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M20 12a8 8 0 0 0-8-8L5 10.5V19h8.5A8 8 0 0 0 20 12z" fill="rgba(255,255,255,.3)" stroke="white" strokeWidth="2"/>
                    <line x1="16" y1="8" x2="2" y2="22" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.45)' }}>SimplyKhata</span>
              </div>
              {/* Mera Hisab */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:20, height:20, borderRadius:4, flexShrink:0,
                  background:'linear-gradient(135deg,#534ab7,#312e81)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:8, fontWeight:800, color:'#fff' }}>mh</div>
                <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.45)' }}>Mera Hisab</span>
              </div>
              {['CloudBooks','FinoSoft','BizTrack'].map(p => (
                <span key={p} style={{ fontSize:11, fontWeight:500, color:'rgba(255,255,255,.28)' }}>{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════ RIGHT PANEL ══════════════ */}
        <div className="rr">
          <div className="rr-card">

            {/* Theme toggle */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:6, marginBottom:18 }}>
              {[{ i:'☀️', a:false }, { i:'🌙', a:true }].map(({ i, a }) => (
                <button key={i} type="button"
                  style={{ width:32, height:32, borderRadius:8, border:'1.5px solid #e8e5e0',
                    background: a ? '#f8f7f4' : '#fff', cursor:'pointer', fontSize:14,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>{i}
                </button>
              ))}
            </div>

            {/* Logo */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
              <div style={{ width:68, height:68, borderRadius:18,
                background:'linear-gradient(135deg,#fdf2f8,#fce7f3)',
                border:'2px solid rgba(199,0,115,.22)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 18px rgba(199,0,115,.15)' }}>
                <img src="/logo.png" alt="Merum"
                  style={{ width:50, height:50, objectFit:'contain' }}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                />
                <span style={{ display:'none', fontSize:26, fontWeight:900, color:'#C70073' }}>M</span>
              </div>
            </div>

            <p style={{ textAlign:'center', fontSize:10.5, fontWeight:700, color:'#C70073',
              letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>Merum CRM</p>
            <h1 style={{ textAlign:'center', fontSize:25, fontWeight:800, color:'#111827',
              letterSpacing:-0.5, marginBottom:7 }}>Welcome back!</h1>
            <p style={{ textAlign:'center', fontSize:13, color:'#9ca3af', marginBottom:26, lineHeight:1.55 }}>
              Sign in to access your CRM dashboard and<br />manage clients, deals, invoices &amp; more.
            </p>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Email */}
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Email address
                </label>
                <div style={{ position:'relative' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round"
                    style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input className="mrm-in" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@merums.com" required autoComplete="email" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Password
                </label>
                <div style={{ position:'relative' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round"
                    style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input className="mrm-in"
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" required autoComplete="current-password"
                    style={{ paddingRight:44 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', color:'#bbb',
                      padding:4, display:'flex', alignItems:'center' }}>
                    {showPw
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer',
                  fontSize:13, color:'#374151', userSelect:'none' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ width:15, height:15, accentColor:'#C70073', cursor:'pointer' }} />
                  Remember me
                </label>
                <button type="button"
                  style={{ background:'none', border:'none', cursor:'pointer',
                    fontSize:13, fontWeight:600, color:'#C70073' }}>
                  Forgot password?
                </button>
              </div>

              {/* Sign In */}
              <button type="submit" disabled={loading} className="mrm-btn" style={{ marginTop:4 }}>
                {loading
                  ? <><span style={{ width:16, height:16, border:'2.5px solid rgba(255,255,255,.3)',
                      borderTopColor:'#fff', borderRadius:'50%', display:'inline-block',
                      animation:'spin .7s linear infinite' }} /> Signing in…</>
                  : 'Sign In →'
                }
              </button>

              {/* Divider */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, height:1, background:'#f0ede8' }} />
                <span style={{ fontSize:12, color:'#c4bfb7', fontWeight:500 }}>or</span>
                <div style={{ flex:1, height:1, background:'#f0ede8' }} />
              </div>

              {/* Google */}
              <button type="button" className="mrm-goog">
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>

            {/* Secure note */}
            <div style={{ display:'flex', alignItems:'center', gap:9, marginTop:16,
              padding:'10px 13px', borderRadius:10, background:'#f9f8f6', border:'1px solid #ede9e3' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C70073" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink:0 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{ fontSize:12, color:'#6b7280' }}>
                <b style={{ color:'#374151' }}>Secure access.</b> Authorised Merum team members only.
              </span>
            </div>

            {/* Ecosystem */}
            <div style={{ marginTop:18, paddingTop:16, borderTop:'1px solid #f0ede8' }}>
              <p style={{ textAlign:'center', fontSize:9.5, fontWeight:700, letterSpacing:1.3,
                textTransform:'uppercase', color:'#c9c5be', marginBottom:10 }}>Merum Ecosystem</p>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'8px 11px',
                  borderRadius:9, background:'#f0fdfb', border:'1px solid #a7f3d033' }}>
                  <div style={{ width:28, height:28, borderRadius:6, flexShrink:0,
                    background:'linear-gradient(135deg,#00a99d,#003459)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20 12a8 8 0 0 0-8-8L5 10.5V19h8.5A8 8 0 0 0 20 12z" fill="rgba(255,255,255,.28)" stroke="white" strokeWidth="1.8"/>
                      <line x1="16" y1="8" x2="2" y2="22" stroke="white" strokeWidth="1.8"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:'#003459' }}>SimplyKhata</div>
                    <div style={{ fontSize:9.5, color:'#00a99d' }}>Cloud Accounting</div>
                  </div>
                </div>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'8px 11px',
                  borderRadius:9, background:'#eeedfe', border:'1px solid #c4b5fd33' }}>
                  <div style={{ width:28, height:28, borderRadius:6, flexShrink:0,
                    background:'linear-gradient(135deg,#534ab7,#312e81)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:9, fontWeight:800, color:'#fff' }}>mh</div>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:'#1a1a18' }}>Mera Hisab</div>
                    <div style={{ fontSize:9.5, color:'#534ab7' }}>Personal Finance</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
              <span style={{ fontSize:10.5, color:'#c4bfb7' }}>© 2025 Merum Shared Services Pvt. Ltd.</span>
              <a href="https://merums.com" target="_blank" rel="noreferrer"
                style={{ fontSize:10.5, color:'#C70073', textDecoration:'none', fontWeight:500 }}>
                merums.com ↗
              </a>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
