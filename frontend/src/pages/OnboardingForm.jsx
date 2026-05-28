// src/pages/OnboardingForm.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Building, User, Briefcase, FileCheck, ShieldCheck, 
  UploadCloud, ArrowLeft, ArrowRight, Save, Clock, Check, AlertCircle, FileSignature 
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const SERVICES_CATALOG = [
  'Bookkeeping & Accounting',
  'TDS Return Filing',
  'GST Return Filing',
  'Payroll Processing',
  'ROC Compliance',
  'Income Tax Return Filing',
  'Internal Audit',
  'Other Services'
];

const COMPLIANCE_PARTICULARS = [
  'GST Returns',
  'TDS Returns',
  'ROC Filings',
  'Income Tax Return'
];

const DOCUMENT_CHECKLIST = [
  { key: 'certificate_of_incorporation', label: 'Certificate of Incorporation' },
  { key: 'pan_card', label: 'PAN Card' },
  { key: 'gst_certificate', label: 'GST Certificate' },
  { key: 'audited_financials', label: 'Audited Financials' },
  { key: 'moa_aoa', label: 'MOA & AOA / Partnership Deed' },
  { key: 'directors_pan_aadhaar', label: 'Directors/Partners PAN & Aadhaar' }
];

export default function OnboardingForm() {
  const { id } = useParams(); // if editing
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead_id');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isApprover = user?.role === 'admin' || user?.role === 'manager';

  const [activeTab, setActiveTab] = useState('A');
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState([]);
  
  const [form, setForm] = useState({
    company_name: '',
    entity_type: 'NGO',
    incorporation_date: '',
    cin_llpin: '',
    pan: '',
    gstin: '',
    registered_address: '',
    communication_address: '',
    primary_contact: '',
    designation: '',
    mobile: '',
    email: '',
    nature_of_business: '',
    industry_type: '',
    turnover: '',
    required_services: [],
    compliance_status: COMPLIANCE_PARTICULARS.map(p => ({
      particular: p,
      filed_up_to_date: true,
      pending_since: '',
      remarks: ''
    })),
    documents: {},
    authorized_signatory: '',
    signature_name: '',
    designation_auth: '',
    auth_date: new Date().toISOString().split('T')[0]
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (id && id !== 'new') {
          // Edit mode
          const { data } = await api.get(`/onboarding/${id}`);
          setForm(data.onboarding || {});
          setTimeline(data.timeline || []);
        } else if (leadId) {
          // Prepopulate from lead
          const { data: lead } = await api.get(`/leads/${leadId}`);
          setForm(f => ({
            ...f,
            lead_id: leadId,
            company_name: lead.org_name || '',
            entity_type: lead.org_type || 'NGO',
            primary_contact: lead.contact_person || '',
            mobile: lead.phone || '',
            email: lead.email || '',
            required_services: lead.interest_services || [],
            nature_of_business: lead.notes || ''
          }));
        }
      } catch (err) {
        toast.error('Error fetching details');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, leadId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Form field styling
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', background: '#fff' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 };
  
  const validateSection = () => {
    // Basic validation depending on current view/saving
    if (activeTab === 'A') {
      if (!form.company_name) return 'Company Name is required';
      if (!form.primary_contact) return 'Primary Contact Person is required';
      if (!form.email) return 'Email ID is required';
      if (!form.mobile) return 'Mobile Number is required';
      if (!form.pan) return 'PAN is required';
      
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(form.pan)) return 'Please enter a valid 10-digit PAN (e.g. ABCDE1234F)';
      if (form.gstin) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(form.gstin)) return 'Please enter a valid 15-digit GSTIN';
      }
    }
    return null;
  };

  const handleSave = async () => {
    const errorMsg = validateSection();
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    try {
      if (id && id !== 'new') {
        const { data } = await api.patch(`/onboarding/${id}`, form);
        setForm(data);
        toast.success('Onboarding saved successfully!');
      } else {
        const { data } = await api.post('/onboarding', form);
        toast.success('Onboarding initialized!');
        navigate(`/onboarding/${data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save onboarding');
    }
  };

  const handleApprove = async () => {
    const missingDocs = DOCUMENT_CHECKLIST.filter(doc => !(form.documents?.[doc.key]?.uploaded));
    let msg = `Are you sure you want to approve "${form.company_name}" and activate their profile?`;
    if (missingDocs.length > 0) {
      msg = `⚠️ Warning: ${missingDocs.length} required document(s) are missing.\n\nAre you sure you want to approve "${form.company_name}" and activate their profile anyway?`;
    }
    if (!window.confirm(msg)) return;
    try {
      await api.post(`/onboarding/${id}/approve`);
      toast.success('Onboarding approved and client profile created!');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve onboarding');
    }
  };

  const handleReject = async () => {
    const reason = window.prompt(`Enter rejection reason for "${form.company_name}":`);
    if (reason === null) return; // cancelled
    try {
      await api.post(`/onboarding/${id}/reject`, { reason });
      toast.success('Onboarding rejected');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject onboarding');
    }
  };

  const toggleService = (name) => {
    const current = form.required_services || [];
    if (current.includes(name)) {
      set('required_services', current.filter(s => s !== name));
    } else {
      set('required_services', [...current, name]);
    }
  };

  const handleComplianceChange = (index, key, val) => {
    const list = [...form.compliance_status];
    list[index][key] = val;
    set('compliance_status', list);
  };

  // Instant Document Upload handler
  const handleFileUpload = async (e, docKey) => {
    if (!id || id === 'new') {
      toast.error('Please save Section A (Basic Info) first to generate onboarding case before uploading documents.');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docKey', docKey);

    const loadingToast = toast.loading('Uploading document...');
    try {
      const { data } = await api.post(`/onboarding/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(data);
      toast.success('Document uploaded successfully!', { id: loadingToast });
      
      // Refresh timeline
      const timelineRes = await api.get(`/onboarding/${id}`);
      setTimeline(timelineRes.data.timeline || []);
    } catch (err) {
      toast.error('Upload failed. Try again.', { id: loadingToast });
    }
  };

  return (
    <div>
      {/* Back link */}
      <button onClick={() => navigate('/onboarding')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: '#666', cursor: 'pointer', marginBottom: 15, fontSize: 13, fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to Onboarding List
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>
            {id && id !== 'new' ? `Onboarding: ${form.company_name}` : 'New Client Onboarding'}
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>
            Status: <span style={{ fontWeight: 600, color: '#C70073' }}>{form.status || 'Pending'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#333' }}>
            <Save size={16} /> Save Progress
          </button>
          {id && id !== 'new' && (
            <button
              onClick={() => navigate(`/onboarding/${id}/agreement`)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #534ab7, #3b2d9e)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <FileSignature size={16} /> Edit Agreement
            </button>
          )}
          {isApprover && id && id !== 'new' && form.status !== 'Active Client' && form.status !== 'Rejected' && (
            <>
              <button onClick={handleApprove} style={{ padding: '10px 20px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Approve & Activate
              </button>
              <button onClick={handleReject} style={{ padding: '10px 20px', background: '#e24b4a', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Tabs / Wizard steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'A', label: 'Basic Info', icon: Building },
            { id: 'B', label: 'Business Info', icon: User },
            { id: 'C', label: 'Services', icon: Briefcase },
            { id: 'D', label: 'Compliance Status', icon: FileCheck },
            { id: 'E', label: 'Documents Checklist', icon: UploadCloud },
            { id: 'F', label: 'Authorize & Sign', icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  const error = validateSection();
                  if (error && tab.id !== 'A') {
                    toast.error(error);
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13.5, fontWeight: 600, transition: 'all 0.2s',
                  background: active ? 'linear-gradient(135deg, #C70073 0%, #9e005b 100%)' : '#fff',
                  color: active ? '#fff' : '#555',
                  boxShadow: active ? '0 4px 12px rgba(199, 0, 115, 0.15)' : 'none',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Activity Timeline Display */}
          {id && id !== 'new' && timeline.length > 0 && (
            <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#C70073" /> Activity Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: '#e8e6e0' }} />
                {timeline.map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#C70073', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff', boxSizing: 'border-box' }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a18' }}>{log.action}</div>
                      <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{log.notes}</div>
                      <div style={{ fontSize: 9, color: '#aaa', marginTop: 1 }}>{new Date(log.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Form Panels */}
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
          {activeTab === 'A' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', borderBottom: '1px solid #eee', paddingBottom: 10 }}>SECTION A – Basic Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Client Company Name *</label>
                  <input style={inputStyle} value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Type of Entity</label>
                  <select style={inputStyle} value={form.entity_type || 'NGO'} onChange={e => set('entity_type', e.target.value)}>
                    <option>NGO</option>
                    <option>FPO</option>
                    <option>Research</option>
                    <option>Community</option>
                    <option>Social Enterprise</option>
                    <option>Private Limited</option>
                    <option>LLP</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date of Incorporation</label>
                  <input type="date" style={inputStyle} value={form.incorporation_date ? form.incorporation_date.slice(0,10) : ''} onChange={e => set('incorporation_date', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>CIN / LLPIN</label>
                  <input style={inputStyle} value={form.cin_llpin || ''} onChange={e => set('cin_llpin', e.target.value)} placeholder="e.g. U74140MH2021PTC355555" />
                </div>
                <div>
                  <label style={labelStyle}>PAN *</label>
                  <input style={inputStyle} value={form.pan || ''} onChange={e => set('pan', e.target.value)} placeholder="10-digit PAN" />
                </div>
                <div>
                  <label style={labelStyle}>GSTIN</label>
                  <input style={inputStyle} value={form.gstin || ''} onChange={e => set('gstin', e.target.value)} placeholder="15-digit GSTIN" />
                </div>
                <div>
                  <label style={labelStyle}>Primary Contact Person *</label>
                  <input style={inputStyle} value={form.primary_contact || ''} onChange={e => set('primary_contact', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Designation</label>
                  <input style={inputStyle} value={form.designation || ''} onChange={e => set('designation', e.target.value)} placeholder="Director / Founder / Manager" />
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number *</label>
                  <input style={inputStyle} value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" />
                </div>
                <div>
                  <label style={labelStyle}>Email ID *</label>
                  <input style={inputStyle} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contact@company.com" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Registered Address</label>
                  <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.registered_address || ''} onChange={e => set('registered_address', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Communication Address</label>
                  <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.communication_address || ''} onChange={e => set('communication_address', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'B' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', borderBottom: '1px solid #eee', paddingBottom: 10 }}>SECTION B – Business Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Industry Type</label>
                  <input style={inputStyle} value={form.industry_type || ''} onChange={e => set('industry_type', e.target.value)} placeholder="e.g. Agriculture, Healthcare, IT" />
                </div>
                <div>
                  <label style={labelStyle}>Turnover (Last FY in ₹)</label>
                  <input style={inputStyle} type="number" value={form.turnover || ''} onChange={e => set('turnover', e.target.value)} placeholder="e.g. 5000000" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Nature of Business</label>
                  <textarea style={{ ...inputStyle, minHeight: 100 }} value={form.nature_of_business || ''} onChange={e => set('nature_of_business', e.target.value)} placeholder="Describe the products or services provided..." />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'C' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', borderBottom: '1px solid #eee', paddingBottom: 10 }}>SECTION C – Required Services</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#f8f7f4', padding: 20, borderRadius: 12 }}>
                {SERVICES_CATALOG.map((svc) => {
                  const checked = (form.required_services || []).includes(svc);
                  return (
                    <label key={svc} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '6px 0' }}>
                      <input 
                        type="checkbox" 
                        checked={checked} 
                        onChange={() => toggleService(svc)} 
                        style={{ width: 16, height: 16, accentColor: '#C70073' }}
                      />
                      {svc}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'D' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', borderBottom: '1px solid #eee', paddingBottom: 10 }}>SECTION D – Compliance Status Table</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
                      <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Particular</th>
                      <th style={{ padding: 10, textAlign: 'center', fontWeight: 600 }}>Filed Up-to-Date?</th>
                      <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Pending Since</th>
                      <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.compliance_status || []).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{row.particular}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={!!row.filed_up_to_date} 
                            onChange={e => handleComplianceChange(idx, 'filed_up_to_date', e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: '#C70073', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <input 
                            style={{ ...inputStyle, padding: '6px 8px' }} 
                            disabled={row.filed_up_to_date}
                            value={row.pending_since || ''} 
                            onChange={e => handleComplianceChange(idx, 'pending_since', e.target.value)}
                            placeholder="Month/Year"
                          />
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <input 
                            style={{ ...inputStyle, padding: '6px 8px' }} 
                            value={row.remarks || ''} 
                            onChange={e => handleComplianceChange(idx, 'remarks', e.target.value)}
                            placeholder="Additional details..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'E' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', borderBottom: '1px solid #eee', paddingBottom: 10 }}>SECTION E – Document Checklist</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {DOCUMENT_CHECKLIST.map(doc => {
                  const docInfo = (form.documents || {})[doc.key] || {};
                  return (
                    <div key={doc.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 16, border: '1px solid #e8e6e0', borderRadius: 12,
                      background: docInfo.uploaded ? '#f1faf6' : '#fff'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{doc.label}</div>
                        {docInfo.uploaded ? (
                          <div style={{ fontSize: 11, color: '#0f6e56', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} /> {docInfo.file_name} (Uploaded)
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={12} /> Missing document
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {docInfo.uploaded && (
                          <a 
                            href={docInfo.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ fontSize: 12, color: '#C70073', fontWeight: 600, textDecoration: 'none' }}
                          >
                            View
                          </a>
                        )}
                        <label style={{
                          padding: '6px 12px', border: '1px solid #ddd', borderRadius: 8,
                          fontSize: 12, fontWeight: 600, background: '#fff', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6
                        }}>
                          <UploadCloud size={13} /> {docInfo.uploaded ? 'Replace' : 'Upload'}
                          <input 
                            type="file" 
                            onChange={e => handleFileUpload(e, doc.key)} 
                            style={{ display: 'none' }} 
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'F' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a18', borderBottom: '1px solid #eee', paddingBottom: 10 }}>SECTION F – Authorization</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Authorized Signatory Name *</label>
                  <input style={inputStyle} value={form.authorized_signatory || ''} onChange={e => set('authorized_signatory', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Signature Confirmation * (Type Name to Sign)</label>
                  <input 
                    style={{ ...inputStyle, fontFamily: 'cursive', fontSize: 15 }} 
                    value={form.signature_name || ''} 
                    onChange={e => set('signature_name', e.target.value)} 
                    placeholder="e.g. Mukesh Kumar"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Designation *</label>
                  <input style={inputStyle} value={form.designation_auth || ''} onChange={e => set('designation_auth', e.target.value)} placeholder="Director / Partner" />
                </div>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" style={inputStyle} value={form.auth_date ? form.auth_date.slice(0, 10) : ''} onChange={e => set('auth_date', e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 24, padding: 16, background: '#fff9fb', border: '1px solid #f9d5e5', borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#C70073', lineHeight: 1.5 }}>
                  🛡️ <b>Declaration:</b> By entering my name in the Signature field above and saving this form, I hereby confirm that all information provided is accurate and all uploaded documents are authentic.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons inside wizard */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, borderTop: '1px solid #eee', paddingTop: 20 }}>
            <button
              disabled={activeTab === 'A'}
              onClick={() => {
                const tabs = ['A','B','C','D','E','F'];
                const prev = tabs[tabs.indexOf(activeTab) - 1];
                if (prev) setActiveTab(prev);
              }}
              style={{
                padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8,
                fontSize: 12.5, fontWeight: 600, background: '#fff', cursor: activeTab === 'A' ? 'not-allowed' : 'pointer',
                opacity: activeTab === 'A' ? 0.5 : 1
              }}
            >
              Previous
            </button>
            <button
              onClick={() => {
                const tabs = ['A','B','C','D','E','F'];
                const next = tabs[tabs.indexOf(activeTab) + 1];
                const error = validateSection();
                if (error) {
                  toast.error(error);
                  return;
                }
                if (next) {
                  setActiveTab(next);
                } else {
                  handleSave();
                }
              }}
              style={{
                padding: '8px 20px', background: 'linear-gradient(135deg, #C70073 0%, #9e005b 100%)',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {activeTab === 'F' ? 'Finish & Save' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
