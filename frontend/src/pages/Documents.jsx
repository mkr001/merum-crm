import { useEffect, useState } from 'react';
import { FolderOpen, FileText, Download, Upload, Trash2, Search, Filter } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

function UploadModal({ clients, onClose, onSave }) {
  const [form, setForm] = useState({ client_id: '', doc_type: 'General' });
  const [files, setFiles] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!files || files.length === 0) return toast.error('Please select files');
    
    setSaving(true);
    const formData = new FormData();
    if (form.client_id) formData.append('client_id', form.client_id);
    formData.append('doc_type', form.doc_type);
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      await api.post('/documents/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Documents uploaded successfully');
      onSave();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to upload');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 450, padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Upload Documents</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Client (Optional)</label>
            <select style={inputStyle} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">No Client (Internal)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Document Type</label>
            <select style={inputStyle} value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value })}>
              <option value="General">General</option>
              <option value="Compliance">Compliance</option>
              <option value="Financial">Financial</option>
              <option value="Legal">Legal</option>
              <option value="KYC">KYC</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Select Files</label>
            <input type="file" multiple onChange={e => setFiles(e.target.files)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchDocs = () => {
    setLoading(true);
    let url = '/documents';
    if (filterClient) url += `?client_id=${filterClient}`;
    Promise.all([
      api.get(url),
      api.get('/clients?limit=1000')
    ]).then(([dRes, cRes]) => {
      setDocs(dRes.data.data || []);
      setClients(cRes.data.data || []);
    }).finally(() => setLoading(false));
  };
  
  useEffect(() => { fetchDocs(); }, [filterClient]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      fetchDocs();
    } catch (e) {
      toast.error('Failed to delete document');
    }
  };

  const filteredDocs = filterType ? docs.filter(d => d.doc_type === filterType) : docs;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Documents</h1>
        <button onClick={() => setModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Upload size={16} /> Upload
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '6px 12px' }}>
          <Filter size={14} color="#888" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#555' }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.org_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '6px 12px' }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#555' }}>
            <option value="">All Types</option>
            <option value="General">General</option>
            <option value="Compliance">Compliance</option>
            <option value="Financial">Financial</option>
            <option value="Legal">Legal</option>
            <option value="KYC">KYC</option>
          </select>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filteredDocs.map(doc => (
            <div key={doc.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <FileText size={20} color="#3b8bd4" style={{ marginTop: 2 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{doc.clients?.org_name || 'Internal'}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>By: {doc.users?.full_name || 'Unknown'}</div>
                </div>
                <button onClick={() => handleDelete(doc.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e24b4a', padding: 2 }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#aaa' }}>
                <span style={{ background: '#f4f4f4', padding: '2px 8px', borderRadius: 10, color: '#666' }}>{doc.doc_type}</span>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b8bd4', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          ))}
          {filteredDocs.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#aaa' }}>No documents found</div>}
        </div>
      )}
      {modal && <UploadModal clients={clients} onClose={() => setModal(false)} onSave={fetchDocs} />}
    </div>
  );
}
