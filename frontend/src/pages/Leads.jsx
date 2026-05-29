// src/pages/Leads.jsx
import { useEffect, useState } from 'react';
import { Plus, Search, Filter, ChevronRight, Phone, Mail, ArrowRight, Trash2, Upload, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import useResponsive from '../utils/useResponsive';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];
const STATUS_COLORS = {
  new:           { bg: '#e6f1fb', text: '#185fa5' },
  contacted:     { bg: '#faeeda', text: '#854f0b' },
  qualified:     { bg: '#eaf3de', text: '#3b6d11' },
  proposal_sent: { bg: '#eeedfe', text: '#534ab7' },
  converted:     { bg: '#e1f5ee', text: '#0f6e56' },
  lost:          { bg: '#fcebeb', text: '#a32d2d' },
};

const ORG_TYPES = ['NGO', 'FPO', 'Research', 'Community', 'Social Enterprise', 'Other'];
const SOURCES   = ['Website', 'Referral', 'Partner', 'LinkedIn', 'Event', 'Cold Call'];

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#eee', text: '#555' };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, textTransform: 'capitalize' }}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(lead || { status: 'new', org_type: 'NGO', source: 'Website', interest_services: [] });
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  const [otherChecked, setOtherChecked] = useState(
    (lead?.interest_services || []).some(s => s.startsWith('Other:'))
  );
  const [otherText, setOtherText] = useState(() => {
    const found = (lead?.interest_services || []).find(s => s.startsWith('Other:'));
    return found ? found.replace('Other: ', '') : '';
  });

  useEffect(() => {
    api.get('/services').then(r => setServices(r.data.data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (name) => {
    const current = form.interest_services || [];
    if (current.includes(name)) {
      set('interest_services', current.filter(s => s !== name));
    } else {
      set('interest_services', [...current, name]);
    }
  };

  const handleSave = async () => {
    if (!form.org_name) return toast.error('Organization name is required');
    setSaving(true);
    try {
      const payload = { ...form };
      // Clean up existing 'Other:' entries
      payload.interest_services = (payload.interest_services || []).filter(s => !s.startsWith('Other:'));
      // Add new 'Other:' entry if checked
      if (otherChecked && otherText.trim()) {
        payload.interest_services.push(`Other: ${otherText.trim()}`);
      }

      if (form.id) {
        const { data } = await api.patch(`/leads/${form.id}`, payload);
        onSave(data, 'updated');
      } else {
        const { data } = await api.post('/leads', payload);
        onSave(data, 'created');
      }
      onClose();
    } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
      <div className="res-modal" style={{ background: '#fff', borderRadius: 16, width: 540, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit Lead' : 'Add New Lead'}</h2>

        <div className="res-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Organization Name *</label>
            <input style={inputStyle} value={form.org_name || ''} onChange={e => set('org_name', e.target.value)} placeholder="e.g. Gram Vikas Foundation" />
          </div>
          <div>
            <label style={labelStyle}>Contact Person</label>
            <input style={inputStyle} value={form.contact_person || ''} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contact@org.com" />
          </div>
          <div>
            <label style={labelStyle}>Org Type</label>
            <select style={inputStyle} value={form.org_type || ''} onChange={e => set('org_type', e.target.value)}>
              {ORG_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Source</label>
            <select style={inputStyle} value={form.source || ''} onChange={e => set('source', e.target.value)}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'new'} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Expected Value (₹)</label>
            <input style={inputStyle} type="number" value={form.expected_value || ''} onChange={e => set('expected_value', e.target.value)} placeholder="50000" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Interest Services</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8f7f4', padding: 12, borderRadius: 8 }}>
              {services.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={(form.interest_services || []).includes(s.name)} onChange={() => toggleService(s.name)} />
                  {s.name}
                </label>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={otherChecked} onChange={(e) => setOtherChecked(e.target.checked)} />
                Other
              </label>
              {services.length === 0 && <span style={{ fontSize: 11, color: '#aaa' }}>Loading services…</span>}
            </div>
            {otherChecked && (
              <div style={{ marginTop: 10 }}>
                <input 
                  style={inputStyle} 
                  value={otherText} 
                  onChange={e => setOtherText(e.target.value)} 
                  placeholder="Please specify other services..." 
                  autoFocus
                />
              </div>
            )}
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Any relevant details…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Upload Modal ──────────────────────────────────────────
function BulkUploadModal({ onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Organization Name': 'Gram Vikas Foundation',
      'Contact Person': 'Aarav Kumar',
      'Email': 'contact@example.com',
      'Phone': '9876543210',
      'Org Type': 'NGO',
      'Source': 'Website',
      'Status': 'new',
      'Expected Value': '50000'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'Leads_Bulk_Upload_Template.xlsx');
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select an Excel file');
    setUploading(true);
    setResults(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            setUploading(false);
            return toast.error('The uploaded Excel file is empty');
          }

          // Map Excel columns to API expected format
          const payload = jsonData.map(row => ({
            org_name: row['Organization Name'] || row['Client Name'] || row['Company Name'] || '',
            contact_person: row['Contact Person'] || '',
            email: row['Email'] || '',
            phone: row['Phone'] || '',
            org_type: row['Org Type'] || 'Other',
            source: row['Source'] || 'Website',
            status: row['Status'] || 'new',
            expected_value: row['Expected Value'] || null
          }));

          const res = await api.post('/leads/bulk', { leads: payload });
          setResults(res.data);
          if (res.data.successCount > 0) {
            toast.success(`${res.data.successCount} leads uploaded successfully`);
            onSave();
          }
        } catch (err) {
          toast.error(err.message || 'Error parsing Excel file');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error('Error reading file');
      setUploading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 550, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>Bulk Upload Leads</h2>
        
        {!results ? (
          <>
            <div style={{ background: '#f8f7f4', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 12, color: '#555' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Expected Excel Columns:</p>
                <button onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#2d9d78', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  <Download size={12} /> Download Template
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, columns: 2 }}>
                <li>Organization Name</li>
                <li>Contact Person</li>
                <li>Email</li>
                <li>Phone</li>
                <li>Org Type</li>
                <li>Source</li>
                <li>Status</li>
                <li>Expected Value</li>
              </ul>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Select Excel File (.xlsx, .csv)</label>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} style={{ width: '100%', padding: '10px', border: '1px dashed #bbb', borderRadius: 8, cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !file} style={{ padding: '9px 22px', background: uploading || !file ? '#aaa' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading || !file ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploading ? 'Processing...' : <><Upload size={16} /> Upload & Save</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <h3 style={{ margin: '0 0 10px', fontSize: 18 }}>Upload Complete</h3>
              <p style={{ margin: 0, color: '#555', fontSize: 14 }}>Successfully uploaded {results.successCount} leads.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button onClick={onClose} style={{ padding: '9px 30px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | lead object
  const [bulkModal, setBulkModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/leads', { params });
      setLeads(data.data || []);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, [filterStatus]);

  const handleSave = (lead, action) => {
    toast.success(`Lead ${action} successfully`);
    fetchLeads();
  };

  const handleConvert = (lead) => {
    navigate(`/onboarding/new?lead_id=${lead.id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted successfully');
      setSelectedIds(prev => prev.filter(x => x !== id));
      fetchLeads();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected leads?`)) return;
    try {
      await api.post('/leads/bulk-delete', { ids: selectedIds });
      toast.success('Leads deleted successfully');
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      toast.error('Failed to delete leads');
    }
  };

  const filtered = leads.filter(l =>
    !search || l.org_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="res-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Leads</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{total} total leads</p>
        </div>
        <div className="res-btn-row" style={{ display: 'flex', gap: 10 }}>
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
              background: '#e24b4a', color: '#fff', border: 'none', borderRadius: 9,
              fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>
              <Trash2 size={16} /> Delete ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setBulkModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={16} /> Bulk Upload
          </button>
          <button onClick={() => setModal('new')} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9,
            fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}>
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {/* Stats/Filters Row */}
      <div className="res-filters" style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="res-table-container" style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              <th style={{ padding: '11px 14px', width: 40 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filtered.map(l => l.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              {['Organization', 'Contact', 'Type', 'Source', 'Status', 'Expected Value', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '12px 14px', width: 40 }}><div style={{ height: 16, width: 16, background: '#f5f5f5', borderRadius: 4 }} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ height: 14, width: '70%', background: '#f5f5f5', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 10, width: '40%', background: '#f5f5f5', borderRadius: 4 }} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ height: 14, width: '60%', background: '#f5f5f5', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 10, width: '50%', background: '#f5f5f5', borderRadius: 4 }} />
                  </td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '60%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '60%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 20, width: '80px', background: '#f5f5f5', borderRadius: 10 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: '50%', background: '#f5f5f5', borderRadius: 4 }} /></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 26, width: '60px', background: '#f5f5f5', borderRadius: 6 }} /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No leads found</td></tr>
            ) : filtered.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 14px', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lead.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(prev => [...prev, lead.id]);
                      } else {
                        setSelectedIds(prev => prev.filter(id => id !== lead.id));
                      }
                    }}
                  />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 500, color: '#1a1a18' }}>{lead.org_name}</div>
                  {lead.notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.notes}</div>}
                </td>
                <td style={{ padding: '12px 14px', color: '#555' }}>
                  <div>{lead.contact_person || '—'}</div>
                  {lead.phone && <div style={{ fontSize: 11, color: '#aaa' }}>{lead.phone}</div>}
                </td>
                <td style={{ padding: '12px 14px', color: '#666' }}>{lead.org_type || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#666' }}>{lead.source || '—'}</td>
                <td style={{ padding: '12px 14px' }}><StatusBadge status={lead.status} /></td>
                <td style={{ padding: '12px 14px', color: '#555' }}>
                  {lead.expected_value ? `₹${Number(lead.expected_value).toLocaleString('en-IN')}` : '—'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setModal(lead)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    {lead.status !== 'converted' && lead.status !== 'lost' && (
                      <button onClick={() => handleConvert(lead)} style={{ padding: '5px 12px', border: '1px solid #2d9d78', borderRadius: 6, background: '#fff', color: '#2d9d78', fontSize: 12, cursor: 'pointer' }}>
                        Convert
                      </button>
                    )}
                    <button onClick={() => handleDelete(lead.id)} style={{
                      padding: '5px', border: '1px solid #e24b4a', borderRadius: 6, background: '#fff', color: '#e24b4a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }} title="Delete Lead">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <LeadModal 
          lead={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {bulkModal && (
        <BulkUploadModal 
          onClose={() => setBulkModal(false)}
          onSave={() => { setBulkModal(false); fetchLeads(); }}
        />
      )}
    </div>
  );
}
