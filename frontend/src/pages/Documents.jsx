// src/pages/Documents.jsx
import { useEffect, useState, useMemo } from 'react';
import { FolderOpen, FileText, Download, Upload, Trash2, Search, X, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const DOC_TYPES = ['General', 'Compliance', 'Financial', 'Legal', 'KYC'];

function Skeleton({ w = '100%', h = 13, r = 6, mb = 0 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%', animation: 'sk 1.4s infinite' }} />
  );
}

function UploadModal({ clients, onClose, onSave, isClient }) {
  const [form, setForm]   = useState({ client_id: '', doc_type: 'General' });
  const [files, setFiles] = useState(null);
  const [saving, setSaving] = useState(false);

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (!files?.length) return toast.error('Please select at least one file');
    setSaving(true);
    const fd = new FormData();
    if (!isClient && form.client_id) fd.append('client_id', form.client_id);
    fd.append('doc_type', form.doc_type);
    Array.from(files).forEach(f => fd.append('files', f));
    try {
      await api.post('/documents/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${files.length} document(s) uploaded`);
      onSave();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 460, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Upload Documents</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isClient && (
            <div>
              <label style={lbl}>Client (Optional)</label>
              <select style={inp} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">No Client (Internal)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={lbl}>Document Type</label>
            <select style={inp} value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value })}>
              {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Select Files</label>
            <div style={{ border: '2px dashed #e0ddd8', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: files ? '#f8f7f4' : '#fff' }}
              onClick={() => document.getElementById('doc-file-input').click()}>
              <Upload size={24} color="#aaa" style={{ display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, color: '#888' }}>
                {files ? `${files.length} file(s) selected` : 'Click to select files'}
              </div>
              <input id="doc-file-input" type="file" multiple onChange={e => setFiles(e.target.files)} style={{ display: 'none' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid #f0ede8' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e8e5e0', borderRadius: 9, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !files?.length}
            style={{ padding: '9px 22px', background: saving || !files?.length ? '#ccc' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving || !files?.length ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving ? 'Uploading…' : <><Upload size={14} /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_COLOR = {
  General:    { bg: '#f8f7f4', color: '#666'    },
  Compliance: { bg: '#eeedfe', color: '#534ab7' },
  Financial:  { bg: '#e1f5ee', color: '#0f6e56' },
  Legal:      { bg: '#faeeda', color: '#854f0b' },
  KYC:        { bg: '#fcebeb', color: '#a32d2d' },
};

export default function Documents() {
  const { user }   = useAuth();
  const isClient   = user?.role === 'client';
  const [docs, setDocs]           = useState([]);
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [modal, setModal]         = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [search, setSearch]             = useState('');

  const fetchDocs = async (client = filterClient) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (!isClient && client) params.client_id = client;
      const requests = [api.get('/documents', { params })];
      if (!isClient) requests.push(api.get('/clients', { params: { limit: 1000 } }));
      const [dRes, cRes] = await Promise.all(requests);
      setDocs(dRes.data.data || []);
      if (cRes) setClients(cRes.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load documents');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(filterClient); }, [filterClient]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch { toast.error('Failed to delete document'); }
  };

  const filtered = useMemo(() => {
    let list = docs;
    if (filterType) list = list.filter(d => d.doc_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.clients?.org_name || '').toLowerCase().includes(q) ||
        (d.doc_type || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [docs, filterType, search]);

  return (
    <div>
      <style>{`@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>{isClient ? 'My Documents' : 'Documents'}</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{filtered.length.toLocaleString()} document{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Upload size={15} /> Upload Documents
        </button>
      </div>

      {isClient && (
        <div style={{ background: 'linear-gradient(135deg,#e1f5ee,#d4f1e8)', border: '1px solid #b8e6d5', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FolderOpen size={18} color="#0f6e56" />
          <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 500 }}>Your documents are securely stored. Upload new files or download existing ones anytime.</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
            style={{ width: '100%', padding: '9px 34px 9px 34px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}><X size={14} /></button>}
        </div>
        {!isClient && (
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            style={{ padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer', maxWidth: 200 }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
          </select>
        )}
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e8e5e0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
          <option value="">All Types</option>
          {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#a32d2d', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={14} /> {error}</div>
          <button onClick={() => fetchDocs()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a32d2d', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '15px 16px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <Skeleton w={20} h={24} r={4} />
                <div style={{ flex: 1 }}><Skeleton w="75%" h={13} mb={6} /><Skeleton w="45%" h={10} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton w={60} h={20} r={10} />
                <Skeleton w={70} h={20} r={6} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: '#bbb', background: '#fff', borderRadius: 13, border: '1px solid #e8e6e0' }}>
          <FolderOpen size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#555', marginBottom: 4 }}>No documents found</div>
          <div style={{ fontSize: 13 }}>{search || filterType ? 'Try adjusting your filters' : 'Upload your first document to get started'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(doc => {
            const tc = TYPE_COLOR[doc.doc_type] || TYPE_COLOR.General;
            return (
              <div key={doc.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '15px 16px', transition: 'border-color .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b8bd4'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e6e0'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <FileText size={20} color="#3b8bd4" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                    {!isClient && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{doc.clients?.org_name || 'Internal'}</div>}
                    <div style={{ fontSize: 10.5, color: '#bbb', marginTop: 2 }}>By {doc.users?.full_name || 'Unknown'}</div>
                  </div>
                  {!isClient && (
                    <button onClick={() => handleDelete(doc.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e24b4a', padding: 2, display: 'flex', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: tc.bg, color: tc.color, fontWeight: 600 }}>{doc.doc_type}</span>
                    <span style={{ fontSize: 10.5, color: '#ccc' }}>{new Date(doc.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b8bd4', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                    <Download size={13} /> Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <UploadModal clients={clients} isClient={isClient} onClose={() => setModal(false)} onSave={() => fetchDocs(filterClient)} />}
    </div>
  );
}
