// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8f7f4', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ width: '90vw', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img 
            src="/logo.png" 
            alt="Merum Logo" 
            style={{
              width: 140,
              height: 'auto',
              marginBottom: 16
            }}
          />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Merum CRM</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e8e6e0',
          padding: '32px 36px'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@merums.com" required
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #ddd',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  transition: 'border 0.15s'
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #ddd',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px', 
                background: loading ? '#aaa' : 'linear-gradient(135deg, #C70073 0%, #a0005c 100%)',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 15,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(199, 0, 115, 0.25)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 20 }}>
          © 2025 Merum Shared Services Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
