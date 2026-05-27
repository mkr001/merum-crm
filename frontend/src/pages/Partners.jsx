import { useEffect, useState } from 'react';
import { HeartHandshake, Globe, Mail, Phone, Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

function PartnerModal({ partner, onClose, onSave }) {
  const [form, setForm] = useState(partner || { name: '', category: '', contact_person: '', contact_email: '', contact_phone: '', website: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  const handleSave = async () => {
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try {
      const { data } = form.id
        ? await api.patch(`/partners/${form.id}`, form)
        : await api.post('/partners', form);
      onSave(data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 500, padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Partner' : 'New Partner'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Partner Name *</label>
            <input style={inputStyle} value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <input style={inputStyle} value={form.category || ''} onChange={e => set('category', e.target.value)} placeholder="e.g. Technology" />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} value={form.website || ''} onChange={e => set('website', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Contact Person</label>
            <input style={inputStyle} value={form.contact_person || ''} onChange={e => set('contact_person', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.contact_phone || ''} onChange={e => set('contact_phone', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchPartners = () => {
    setLoading(true);
    api.get('/partners').then(r => setPartners(r.data.data || [])).finally(() => setLoading(false));
  };
  
  useEffect(() => { fetchPartners(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this partner?')) return;
    try {
      await api.delete(`/partners/${id}`);
      toast.success('Partner deleted');
      fetchPartners();
    } catch (e) {
      toast.error('Failed to delete partner');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Partners & Network</h1>
        <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> New Partner
        </button>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {partners.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eeedfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartHandshake size={18} color="#534ab7" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{p.category}</div>
                </div>
                <button onClick={() => setModal(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#888' }}><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#e24b4a' }}><Trash2 size={16} /></button>
              </div>
              {p.contact_person && <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>👤 {p.contact_person}</div>}
              {p.contact_email && <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>✉ {p.contact_email}</div>}
              {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b8bd4' }}>🌐 {p.website}</a>}
            </div>
          ))}
          {partners.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#aaa' }}>No partners added yet</div>}
        </div>
      )}
      {modal && (
        <PartnerModal
          partner={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { toast.success('Saved!'); fetchPartners(); }}
        />
      )}
    </div>
  );
}
