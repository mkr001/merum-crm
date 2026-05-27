// src/pages/Clients.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ChevronRight, Trash2, Upload } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const ORG_TYPES = ['NGO', 'FPO', 'Research', 'Community', 'Social Enterprise', 'Other'];

function BulkUploadModal({ onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFile = (e) => setFile(e.target.files[0]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      org_name: 'Example Corp', org_type: 'NGO', registration_number: '12345',
      pan_number: 'ABCDE1234F', gstin: '22AAAAA0000A1Z5', website: 'https://example.com',
      city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India',
      address: '123 Main St', status: 'active'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'clients_template.xlsx');
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file');
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      
      const res = await api.post('/clients/bulk', { clients: rows });
      setResults(res.data);
      toast.success(`Successfully added ${res.data.inserted} clients.`);
      if (res.data.skipped > 0) {
        toast.error(`Skipped ${res.data.skipped} clients due to errors.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload clients');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 480, padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Bulk Upload Clients</h2>
        
        {results ? (
          <div>
            <div style={{ marginBottom: 20, padding: 16, background: '#f8f7f4', borderRadius: 8 }}>
              <p style={{ margin: '0 0 10px', fontSize: 14 }}><b>Upload Complete!</b></p>
              <p style={{ margin: '0 0 5px', fontSize: 13, color: '#3b6d11' }}>✅ {results.inserted} inserted successfully</p>
              <p style={{ margin: 0, fontSize: 13, color: '#a32d2d' }}>❌ {results.skipped} skipped (errors)</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { onSave(); onClose(); }} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 15 }}>Upload an Excel or CSV file to add multiple clients at once. Maximum 500 records per file.</p>
              <button onClick={downloadTemplate} style={{ fontSize: 12, color: '#3b8bd4', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Download Template</button>
            </div>
            <div style={{ border: '2px dashed #ddd', borderRadius: 10, padding: 30, textAlign: 'center', marginBottom: 20 }}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !file} style={{ padding: '9px 20px', background: file ? '#2d9d78' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: file ? 'pointer' : 'not-allowed' }}>
                {uploading ? 'Uploading...' : 'Upload Clients'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState(client || { status: 'active', country: 'India' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (!form.org_name) return toast.error('Organization name is required');
    setSaving(true);
    try {
      let data;
      if (form.id) {
        ({ data } = await api.patch(`/clients/${form.id}`, form));
      } else {
        ({ data } = await api.post('/clients', form));
      }
      onSave(data);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 580, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Client' : 'Add New Client'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Organization Name *</label>
            <input style={inputStyle} value={form.org_name || ''} onChange={e => set('org_name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Org Type</label>
            <select style={inputStyle} value={form.org_type || ''} onChange={e => set('org_type', e.target.value)}>
              <option value="">Select…</option>
              {ORG_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'active'} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Registration No.</label>
            <input style={inputStyle} value={form.registration_number || ''} onChange={e => set('registration_number', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>PAN Number</label>
            <input style={inputStyle} value={form.pan_number || ''} onChange={e => set('pan_number', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>GSTIN</label>
            <input style={inputStyle} value={form.gstin || ''} onChange={e => set('gstin', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} value={form.website || ''} onChange={e => set('website', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.city || ''} onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={form.state || ''} onChange={e => set('state', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Address</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.address || ''} onChange={e => set('address', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1', borderTop: '1px solid #eee', paddingTop: 14, marginTop: 6 }}>
            <label style={{ ...labelStyle, fontSize: 13, color: '#C70073', fontWeight: 600 }}>Active Merum SaaS Solutions</label>
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!form.simplykhata_active} 
                  onChange={e => set('simplykhata_active', e.target.checked)} 
                  style={{ width: 16, height: 16, accentColor: '#C70073' }}
                />
                SimplyKhata deployed
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!form.merahisab_active} 
                  onChange={e => set('merahisab_active', e.target.checked)} 
                  style={{ width: 16, height: 16, accentColor: '#C70073' }}
                />
                Mera Hisab deployed
              </label>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'deleted'
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const fetchClients = async (tab = viewTab) => {
    setLoading(true);
    try {
      const params = tab === 'deleted' ? { status: 'deleted' } : {};
      const { data } = await api.get('/clients', { params });
      setClients(data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(viewTab); }, [viewTab]);

  const handleTabSwitch = (tab) => {
    setViewTab(tab);
    setSearch('');
  };

  const filtered = clients.filter(c =>
    !search || c.org_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_BADGE = {
    active:   { bg: '#eaf3de', color: '#3b6d11' },
    inactive: { bg: '#f8f7f4', color: '#888' },
    churned:  { bg: '#fff3cd', color: '#856404' },
    deleted:  { bg: '#fcebeb', color: '#a32d2d' },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Clients</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{clients.length} {viewTab === 'deleted' ? 'deleted' : 'total'} clients</p>
        </div>
        {viewTab === 'active' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setModal('bulk')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Upload size={16} /> Bulk Upload
            </button>
            <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={16} /> Add Client
            </button>
          </div>
        )}
      </div>

      {/* Admin View Tabs */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 18, border: '1px solid #e8e6e0', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
          <button
            onClick={() => handleTabSwitch('active')}
            style={{
              padding: '8px 22px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: viewTab === 'active' ? '#2d9d78' : '#fff',
              color: viewTab === 'active' ? '#fff' : '#666',
              transition: 'all 0.15s',
            }}
          >
            Active Clients
          </button>
          <button
            onClick={() => handleTabSwitch('deleted')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 22px', border: 'none', borderLeft: '1px solid #e8e6e0', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: viewTab === 'deleted' ? '#e24b4a' : '#fff',
              color: viewTab === 'deleted' ? '#fff' : '#888',
              transition: 'all 0.15s',
            }}
          >
            <Trash2 size={13} /> Deleted Clients
          </button>
        </div>
      )}

      {/* Deleted clients banner */}
      {viewTab === 'deleted' && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#a32d2d', fontWeight: 500 }}>
          🗑️ Showing archived (deleted) clients. Click any client to view details or restore them.
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 18 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
          style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Clients Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '18px 20px', height: 130 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f5f5f5' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, width: '60%', background: '#f5f5f5', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 10, width: '40%', background: '#f5f5f5', borderRadius: 4 }} />
                  </div>
                </div>
              </div>
              <div style={{ height: 10, width: '30%', background: '#f5f5f5', borderRadius: 4, marginTop: 20 }} />
            </div>
          ))
        ) : filtered.map(client => {
          const badge = STATUS_BADGE[client.status] || STATUS_BADGE.inactive;
          return (
            <div key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              style={{
                background: '#fff',
                border: `1px solid ${client.status === 'deleted' ? '#f5c6c6' : '#e8e6e0'}`,
                borderRadius: 12, padding: '18px 20px', cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                opacity: client.status === 'deleted' ? 0.85 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: client.status === 'deleted' ? '#fcebeb' : '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {client.status === 'deleted'
                      ? <Trash2 size={17} color="#a32d2d" />
                      : <Building2 size={18} color="#0f6e56" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a18' }}>{client.org_name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{client.org_type || 'Organization'}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                  {client.status}
                </span>
              </div>
              {(client.city || client.state) && (
                <div style={{ fontSize: 12, color: '#888' }}>{[client.city, client.state].filter(Boolean).join(', ')}</div>
              )}

              {/* Onboarding Progress Bar */}
              {client.status === 'active' && client.onboarding_total > 0 && (
                <div style={{ marginTop: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 5 }}>
                    <span>Onboarding Progress</span>
                    <span style={{ fontWeight: 600, color: client.onboarding_progress === 100 ? '#2d9d78' : '#888' }}>
                      {client.onboarding_progress}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#eee', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${client.onboarding_progress}%`, 
                      height: '100%', 
                      background: client.onboarding_progress === 100 ? '#2d9d78' : '#3b8bd4',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <ChevronRight size={14} color="#aaa" />
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, color: '#aaa' }}>
            {viewTab === 'deleted' ? (
              <>
                <Trash2 size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                No deleted clients found
              </>
            ) : 'No clients found'}
          </div>
        )}
      </div>

      {modal === 'new' && (
        <ClientModal
          client={null}
          onClose={() => setModal(null)}
          onSave={() => { toast.success('Client saved!'); fetchClients(); }}
        />
      )}
      
      {modal === 'bulk' && (
        <BulkUploadModal
          onClose={() => setModal(null)}
          onSave={() => fetchClients()}
        />
      )}
    </div>
  );
}
