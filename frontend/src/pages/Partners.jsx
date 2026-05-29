// src/pages/Partners.jsx
import { useEffect, useState, useMemo } from 'react';
import { HeartHandshake, Globe, Mail, Phone, Plus, Edit2, Trash2, Search, X, Download, Filter, Users, UserCheck, UserX, Clock } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import useResponsive from '../utils/useResponsive';

// ── Category Colors ────────────────────────────────────────────
const CATEGORY_COLORS = {
  technology: { bg: '#eeedfe', color: '#534ab7', icon: '💻' },
  finance:    { bg: '#e1f5ee', color: '#0f6e56', icon: '💰' },
  legal:      { bg: '#fcf0e0', color: '#b8860b', icon: '⚖️' },
  network:    { bg: '#e8f4fd', color: '#1976d2', icon: '🌐' },
  marketing:  { bg: '#fce4ec', color: '#c62828', icon: '📢' },
  consulting: { bg: '#f3e5f5', color: '#7b1fa2', icon: '🧠' },
  hr:         { bg: '#fff3e0', color: '#e65100', icon: '👥' },
  default:    { bg: '#f8f7f4', color: '#666',    icon: '🤝' },
};

const STATUS_STYLE = {
  active:   { bg: '#e1f5ee', color: '#0f6e56', label: 'Active' },
  inactive: { bg: '#f8f7f4', color: '#888',    label: 'Inactive' },
  prospect: { bg: '#eeedfe', color: '#534ab7', label: 'Prospect' },
};

function getCategoryStyle(cat) {
  if (!cat) return CATEGORY_COLORS.default;
  return CATEGORY_COLORS[cat.toLowerCase()] || CATEGORY_COLORS.default;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Partner Modal ──────────────────────────────────────────────
function PartnerModal({ partner, onClose, onSave }) {
  const [form, setForm] = useState(partner || {
    name: '', category: '', contact_person: '', contact_email: '',
    contact_phone: '', website: '', notes: '', status: 'active'
  });
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

  const categories = ['Technology', 'Finance', 'Legal', 'Network', 'Marketing', 'Consulting', 'HR', 'Other'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
      <div className="res-modal" style={{ background: '#fff', borderRadius: 16, width: 540, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Partner' : 'New Partner'}</h2>
        <div className="res-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Partner Name *</label>
            <input style={inputStyle} value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category || ''} onChange={e => set('category', e.target.value)}>
              <option value="">-- Select --</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'active'} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label style={labelStyle}>Contact Person</label>
            <input style={inputStyle} value={form.contact_person || ''} onChange={e => set('contact_person', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.contact_phone || ''} onChange={e => set('contact_phone', e.target.value)} placeholder="+91..." />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
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

// ── Main Partners Page ─────────────────────────────────────────
export default function Partners() {
  const { isMobile } = useResponsive();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchPartners = () => {
    setLoading(true);
    api.get('/partners').then(r => setPartners(r.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPartners(); }, []);

  // ── Derived data ───────────────────────────────────────────
  const filteredPartners = useMemo(() => {
    let list = partners;
    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    if (filterCategory) list = list.filter(p => (p.category || '').toLowerCase() === filterCategory.toLowerCase());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.contact_person || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.contact_email || '').toLowerCase().includes(q) ||
        (p.contact_phone || '').includes(q)
      );
    }
    return list;
  }, [partners, filterStatus, filterCategory, searchQuery]);

  const categories = useMemo(() => {
    const cats = [...new Set(partners.map(p => p.category).filter(Boolean))];
    return cats.sort();
  }, [partners]);

  const stats = useMemo(() => ({
    total:    partners.length,
    active:   partners.filter(p => p.status === 'active').length,
    inactive: partners.filter(p => p.status === 'inactive').length,
    prospect: partners.filter(p => p.status === 'prospect').length,
  }), [partners]);

  // ── Actions ────────────────────────────────────────────────
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

  const handleExport = () => {
    if (filteredPartners.length === 0) return toast.error('No partners to export');
    const data = filteredPartners.map(p => ({
      'Name': p.name,
      'Category': p.category || '',
      'Status': p.status || 'active',
      'Contact Person': p.contact_person || '',
      'Email': p.contact_email || '',
      'Phone': p.contact_phone || '',
      'Website': p.website || '',
      'Notes': p.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partners');
    XLSX.writeFile(wb, 'partners_export.xlsx');
    toast.success('Exported successfully!');
  };

  return (
    <div>
      {/* Header */}
      <div className="res-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Partners & Network</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="res-btn-row" style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={16} /> Export
          </button>
          <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> New Partner
          </button>
        </div>
      </div>

      <div className="res-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          ['Total', stats.total, '#1a1a18', Users],
          ['Active', stats.active, '#0f6e56', UserCheck],
          ['Prospect', stats.prospect, '#534ab7', Clock],
          ['Inactive', stats.inactive, '#888', UserX],
        ].map(([label, val, color, Icon]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search by name, contact person, category, email, or phone…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '9px 14px 9px 36px', border: '1px solid #e0ddd8', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Status Tabs */}
        {[['', 'All'], ['active', 'Active'], ['prospect', 'Prospect'], ['inactive', 'Inactive']].map(([s, label]) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              padding: '7px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              borderColor: filterStatus === s ? '#2d9d78' : '#ddd',
              background: filterStatus === s ? '#e1f5ee' : '#fff',
              color: filterStatus === s ? '#0f6e56' : '#666',
            }}>{label}
          </button>
        ))}

        {/* Category Filter */}
        {categories.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="#888" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid #ddd', fontSize: 12, outline: 'none', background: '#fff', cursor: 'pointer' }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Partners Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading…</div>
      ) : filteredPartners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#aaa' }}>
          <HeartHandshake size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
          <div style={{ fontSize: 14 }}>{searchQuery || filterStatus || filterCategory ? 'No partners match your filters' : 'No partners added yet'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredPartners.map(p => {
            const catStyle = getCategoryStyle(p.category);
            const statusStyle = STATUS_STYLE[p.status] || STATUS_STYLE.active;

            return (
              <div key={p.id} style={{
                background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 0, overflow: 'hidden',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Card Header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f0ede8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Avatar with Initials */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: catStyle.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: catStyle.color, flexShrink: 0,
                    }}>
                      {getInitials(p.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        {p.category && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 12,
                            background: catStyle.bg, color: catStyle.color, fontWeight: 600,
                          }}>
                            {catStyle.icon} {p.category}
                          </span>
                        )}
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 12,
                          background: statusStyle.bg, color: statusStyle.color, fontWeight: 600,
                        }}>
                          {statusStyle.label}
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => setModal(p)} title="Edit"
                        style={{ border: '1px solid #eee', background: '#fafafa', cursor: 'pointer', padding: '6px', borderRadius: 7, color: '#888', display: 'flex', alignItems: 'center' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} title="Delete"
                        style={{ border: '1px solid #f5c6c6', background: '#fcebeb', cursor: 'pointer', padding: '6px', borderRadius: 7, color: '#a32d2d', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '14px 20px 16px' }}>
                  {/* Contact Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {p.contact_person && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#444' }}>
                        <Users size={13} color="#999" style={{ flexShrink: 0 }} />
                        <span>{p.contact_person}</span>
                      </div>
                    )}
                    {p.contact_email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#444' }}>
                        <Mail size={13} color="#999" style={{ flexShrink: 0 }} />
                        <a href={`mailto:${p.contact_email}`} style={{ color: '#3b8bd4', textDecoration: 'none' }}>{p.contact_email}</a>
                      </div>
                    )}
                    {p.contact_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#444' }}>
                        <Phone size={13} color="#999" style={{ flexShrink: 0 }} />
                        <a href={`tel:${p.contact_phone}`} style={{ color: '#333', textDecoration: 'none' }}>{p.contact_phone}</a>
                      </div>
                    )}
                    {p.website && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                        <Globe size={13} color="#999" style={{ flexShrink: 0 }} />
                        <a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#3b8bd4', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Notes preview */}
                  {p.notes && (
                    <div style={{
                      marginTop: 10, padding: '8px 10px', background: '#f8f7f4', borderRadius: 8,
                      fontSize: 11.5, color: '#777', lineHeight: 1.5,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {p.notes}
                    </div>
                  )}

                  {/* Empty state for cards with no contact info */}
                  {!p.contact_person && !p.contact_email && !p.contact_phone && !p.website && !p.notes && (
                    <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', paddingTop: 4 }}>No contact details added</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
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
