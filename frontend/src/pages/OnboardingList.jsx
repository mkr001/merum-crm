// src/pages/OnboardingList.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileSignature, CheckCircle, XCircle, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLE = {
  'Pending':                    { bg: '#faeeda', color: '#854f0b' },
  'Documents Pending':          { bg: '#eeedfe', color: '#534ab7' },
  'Verification In Progress':   { bg: '#e6f1fb', color: '#185fa5' },
  'Approved':                   { bg: '#e1f5ee', color: '#0f6e56' },
  'Rejected':                   { bg: '#fcebeb', color: '#a32d2d' },
  'Active Client':              { bg: '#eaf3de', color: '#3b6d11' },
};

const DOC_KEYS = [
  'certificate_of_incorporation', 'pan_card', 'gst_certificate',
  'audited_financials', 'moa_aoa', 'directors_pan_aadhaar'
];

export default function OnboardingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isApprover = user?.role === 'admin' || user?.role === 'manager';

  const fetchOnboardings = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const { data } = await api.get('/onboarding', { params });
      setItems(data.data || []);
    } catch (err) {
      toast.error('Failed to load onboarding workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardings();
  }, [filterStatus]);

  const handleApprove = async (item) => {
    const missingDocs = DOC_KEYS.filter(k => !(item.documents?.[k]?.uploaded));
    let msg = `Are you sure you want to approve "${item.company_name}" and activate their profile?`;
    if (missingDocs.length > 0) {
      msg = `⚠️ Warning: ${missingDocs.length} required document(s) are missing.\n\nAre you sure you want to approve "${item.company_name}" and activate their profile anyway?`;
    }
    if (!window.confirm(msg)) return;
    try {
      await api.post(`/onboarding/${item.id}/approve`);
      toast.success('Onboarding approved and client profile created!');
      fetchOnboardings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve onboarding');
    }
  };

  const handleReject = async (id, name) => {
    const reason = window.prompt(`Enter rejection reason for "${name}":`);
    if (reason === null) return; // cancelled
    try {
      await api.post(`/onboarding/${id}/reject`, { reason });
      toast.success('Onboarding rejected');
      fetchOnboardings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject onboarding');
    }
  };

  const calculateProgress = (item) => {
    let score = 0;
    let max = 7; // 6 documents + Section F signing

    const docs = item.documents || {};
    DOC_KEYS.forEach(k => {
      if (docs[k]?.uploaded) score++;
    });

    if (item.authorized_signatory && item.signature_name) {
      score++;
    }

    return Math.round((score / max) * 100);
  };

  const filtered = items.filter(item => 
    !search || 
    item.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.primary_contact?.toLowerCase().includes(search.toLowerCase()) ||
    item.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Client Onboarding</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>Manage and verify prospective clients onboarding flows</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search company or contact..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['', 'Pending', 'Documents Pending', 'Verification In Progress', 'Approved', 'Rejected', 'Active Client'].map((s, i) => (
            <button key={i} onClick={() => setFilterStatus(s)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                borderColor: filterStatus === s ? '#C70073' : '#ddd',
                background: filterStatus === s ? '#fcebf4' : '#fff',
                color: filterStatus === s ? '#C70073' : '#666',
                transition: 'all 0.15s'
              }}>
              {s === '' ? 'All Statuses' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20, height: 160 }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, color: '#aaa', background: '#fff', borderRadius: 12, border: '1px solid #e8e6e0' }}>
            <FileSignature size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
            No onboarding records found.
          </div>
        ) : filtered.map(item => {
          const style = STATUS_STYLE[item.status] || { bg: '#eee', color: '#333' };
          const progress = calculateProgress(item);

          return (
            <div key={item.id} style={{
              background: '#fff',
              border: '1px solid #e8e6e0',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              position: 'relative'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.company_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      Type: {item.entity_type || 'N/A'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 20,
                    background: style.bg, color: style.color, fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {item.status}
                  </span>
                </div>

                {/* Onboarding Progress */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 5 }}>
                    <span>Onboarding Progress</span>
                    <span style={{ fontWeight: 600, color: progress === 100 ? '#2d9d78' : '#888' }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#eee', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{
                      width: `${progress}%`, height: '100%',
                      background: progress === 100 ? '#2d9d78' : 'linear-gradient(90deg, #C70073 0%, #9e005b 100%)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, fontSize: 12, color: '#555', marginBottom: 16 }}>
                  <div><b>Primary Contact:</b> {item.primary_contact || 'N/A'} ({item.mobile})</div>
                  <div><b>Email:</b> {item.email}</div>
                  {item.client_uid && <div style={{ color: '#C70073' }}><b>Client ID:</b> {item.client_uid}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid #f0ede8', paddingTop: 14 }}>
                <button
                  onClick={() => navigate(`/onboarding/${item.id}`)}
                  style={{
                    flex: 1, padding: '7px 10px', background: '#f5f5f5', border: '1px solid #ddd',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                  }}
                >
                  <FileText size={13} /> View Form
                </button>
                <button
                  onClick={() => navigate(`/onboarding/${item.id}/agreement`)}
                  style={{
                    padding: '7px 10px', background: '#eeedfe', border: '1px solid #d5d3f0',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    color: '#534ab7'
                  }}
                >
                  <FileSignature size={13} /> Agreement
                </button>

                {isApprover && item.status !== 'Active Client' && item.status !== 'Rejected' && (
                  <>
                    <button
                      onClick={() => handleApprove(item)}
                      style={{
                        padding: '7px 12px', background: '#2d9d78', color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(item.id, item.company_name)}
                      style={{
                        padding: '7px 12px', background: '#e24b4a', color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
