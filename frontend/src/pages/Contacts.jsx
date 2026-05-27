// src/pages/Contacts.jsx
import { useEffect, useState } from 'react';
import { Search, Mail, Phone, Building2 } from 'lucide-react';
import api from '../utils/api';
import { Link } from 'react-router-dom';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/contacts').then(r => setContacts(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const filteredContacts = contacts.filter(c => 
    (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.clients?.org_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Global Contacts</h1>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} color="#aaa" style={{ position: 'absolute', left: 12, top: 10 }} />
          <input 
            type="text" 
            placeholder="Search name, email, or client..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #ddd', borderRadius: 20, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>
      
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading…</div> : (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Client / Lead</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Contact Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1a1a18' }}>{c.full_name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{c.designation || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.client_id ? (
                      <Link to={`/clients/${c.client_id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2d9d78', textDecoration: 'none', fontWeight: 500 }}>
                        <Building2 size={14} /> {c.clients?.org_name || 'Unknown Client'}
                      </Link>
                    ) : (
                      <span style={{ color: '#888' }}>No Client</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#555', marginBottom: 4 }}><Mail size={13} /> {c.email}</div>}
                    {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#555' }}><Phone size={13} /> {c.phone}</div>}
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No contacts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
