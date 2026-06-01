// src/pages/Contacts.jsx
import { useEffect, useState, useMemo } from 'react';
import { Search, Mail, Phone, Building2, Users, X, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { Link } from 'react-router-dom';

function Skeleton({ w = '100%', h = 13, r = 6 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%', animation: 'sk 1.4s infinite' }} />
  );
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.get('/contacts')
      .then(r => setContacts(r.data.data || []))
      .catch(() => setError('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.clients?.org_name || '').toLowerCase().includes(q) ||
      (c.designation || '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  return (
    <div>
      <style>{`@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>Contacts</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{contacts.length.toLocaleString()} total contacts</p>
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            type="text"
            placeholder="Search name, email, phone, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 34px 9px 34px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#a32d2d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 13, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              {['Contact', 'Organisation', 'Contact Info', 'Primary'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Skeleton w={36} h={36} r={18} />
                      <div><Skeleton w={120} h={13} /><div style={{ marginTop: 6 }}><Skeleton w={80} h={10} /></div></div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}><Skeleton w="70%" h={13} /></td>
                  <td style={{ padding: '14px 16px' }}><Skeleton w="80%" h={12} /><div style={{ marginTop: 6 }}><Skeleton w="60%" h={12} /></div></td>
                  <td style={{ padding: '14px 16px' }}><Skeleton w={40} h={20} r={10} /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
                  <Users size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#555', marginBottom: 4 }}>No contacts found</div>
                  <div style={{ fontSize: 13 }}>{search ? 'Try a different search' : 'No contacts in the system yet'}</div>
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0ede8', transition: 'background .12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#faf9f7'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                <td style={{ padding: '13px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#185fa5', flexShrink: 0 }}>
                      {c.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1a1a18' }}>{c.full_name || '—'}</div>
                      <div style={{ fontSize: 11.5, color: '#888' }}>{c.designation || '—'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '13px 16px' }}>
                  {c.client_id ? (
                    <Link to={`/clients/${c.client_id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2d9d78', textDecoration: 'none', fontWeight: 500, fontSize: 13 }}>
                      <Building2 size={13} /> {c.clients?.org_name || 'Unknown'}
                    </Link>
                  ) : (
                    <span style={{ color: '#bbb', fontSize: 13 }}>No client linked</span>
                  )}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b8bd4', textDecoration: 'none', fontSize: 12.5, marginBottom: c.phone ? 5 : 0 }}>
                      <Mail size={12} /> {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2d9d78', textDecoration: 'none', fontSize: 12.5 }}>
                      <Phone size={12} /> {c.phone}
                    </a>
                  )}
                  {!c.email && !c.phone && <span style={{ color: '#ccc', fontSize: 12 }}>No contact info</span>}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  {c.is_primary && (
                    <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 20, background: '#e1f5ee', color: '#0f6e56', fontWeight: 700 }}>Primary</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
