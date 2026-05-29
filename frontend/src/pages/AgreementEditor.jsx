// src/pages/AgreementEditor.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Printer, RotateCcw, FileSignature } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function AgreementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef(null);

  // ── Load record & HTML ───────────────────────────────────────────────────
  const loadAgreement = useCallback(async (forceReset = false) => {
    setLoading(true);
    try {
      const { data: onbData } = await api.get(`/onboarding/${id}`);
      setOnboarding(onbData.onboarding);

      // Fetch the agreement HTML
      let html = '';
      if (forceReset) {
        // If resetting, we need the backend to generate the default. We can fetch the raw default by passing a flag or temporarily clearing custom_html.
        await api.patch(`/onboarding/${id}`, { agreement_overrides: {} });
        const resp = await fetch(`${API_BASE}/onboarding/${id}/agreement`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('merum_token')}` }
        });
        html = await resp.text();
      } else {
        const resp = await fetch(`${API_BASE}/onboarding/${id}/agreement`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('merum_token')}` }
        });
        html = await resp.text();
      }

      // Write to iframe
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
        doc.designMode = 'on'; // Make it fully editable!
        
        // Add some basic styles to the body for the editing experience
        const style = doc.createElement('style');
        style.innerHTML = `
          body { padding: 20px; background: #e8e6e0; }
          .page { cursor: text; }
          .no-print-bar { display: none !important; }
        `;
        doc.head.appendChild(style);
      }
    } catch (err) {
      toast.error('Failed to load agreement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAgreement();
  }, [loadAgreement]);

  // ── Overrides state ────────────────────────────────────────────────────
  const [overrides, setOverrides] = useState({
    effective_date: '',
    master_agreement_ref: 'Transforming Rural India Foundation',
    master_agreement_date: '01st Feburary,2026',
    monthly_fee: '15,000',
    fee_text: "Monthly INR 15,000/- plus applicable GST. These fees will be exclusive of Government / Departmental fees and other out of pocket expenses (if above Rs. 1,000/- approval from client required) as applicable.\n\nNote: Currently, one visit shall be provided at your location upon prior scheduling. The conveyance cost (if required) for such visit shall be borne by the client.",
    merum_signatory_name: 'Arvind Tripathi',
    merum_signatory_title: 'Director',
    client_signatory_name: '',
    client_signature_name: '',
    client_signatory_title: '',
    service_levels: [], // Populated by DEFAULT_SERVICE_LEVELS
    client_responsibilities: [], // Populated by DEFAULT_RESPONSIBILITIES
    custom_clauses: [],
  });

  // ── Save overrides to DB ───────────────────────────────────────────────
  const DEFAULT_SERVICE_LEVELS = [
  { component: 'Monthly financial reports', target: 'Delivered by the 8th working day of each month' },
  { component: 'Turnaround time for accounting', target: 'Within 2 business days' },
  { component: 'Finalized year end Accounts', target: 'Within 60 days' },
  { component: 'Any special Report', target: 'Within 5 Working days' },
  { component: 'Query Response Time', target: 'Within 1 business day' },
  { component: 'Data accuracy', target: '100%' },
  { component: 'System uptime (if using shared platform)', target: '99% monthly' },
  { component: 'Issue resolution', target: 'Case to case, agreed between parties' },
  { component: 'Statutory Compliances', target: 'Before the time limit prescribed by the different Laws' },
  { component: 'Closure File at the end of the Financial Year\n- Opening and Closing Balance\n- Income & Expenditure, Balance sheet\n- Cash Flow and related schedules\n- Copy of all related challans and returns\n- Full accounting data backup - Pen drive\n- Voucher Files, Agreements etc.', target: 'Within 90 days of Financial Year end' }
];

const DEFAULT_RESPONSIBILITIES = [
  'Provide daily transaction updates through pre-designed Transaction Sheet via email /designated whatsapp group before the 2nd business working day of the following month. Preferably via email. If volume of transactions increase by more than 20% shall require mutual written agreement on revised timelines and/or fees before implementation. Provide Monthly bank statements before 2nd day of following month.',
  'Notify of any changes in regulatory requirements, Directors, shareholders, key management personnel within 7 days of such change.',
  'Give prior information of at least 7 days of Board/ General meeting to be conducted, agenda points, and post meeting information, attendance, decisions made in such meeting of Board of Trustees',
  'Provide information of any agreements, arrangements entered by the company withing 7 days of such agreement, arrangements made',
  'Provide joining and resignation of staff members within 7 days along with job positions, KYC documents',
  'Attend and active participation of monthly meeting with Merum team on issues raised, resolutions, actions to be taken and any changes in approach required from either side',
  'Furnishing all hard copies supporting documents for accounting',
  'Provide timely, accurate and complete data/documents required for processing',
  'Notify any changes in regulatory requirements',
  'Notify people changes in the key Decision-making',
  'Approve deliverables within 5 working days of submission. In the absence of response within 5 working days, deliverables shall not be deemed automatically approved unless explicitly confirmed in writing.',
  'Note: Any delays in month end closing on account of system unavailability, client information pending, among others (matter escalated to client) might have cascading effect on other deliverables. Further, if volumes of transactions rise beyond 20% of existing load, then additional time may be required as additional resourcing arrangements might have to be done.',
  'Official financial data and compliance submissions shall be communicated only through email or designated secure shared platform. Informal communication channels shall not constitute official submission. (For example, WhatsApp)'
];

const DEFAULT_SOW_HTML = `
<p style="font-size:12px; font-weight: 700; text-decoration: underline; margin:15px 0 5px;">Book Keeping, Accounting Support</p>
<ul style="font-size:12px; margin:0 0 10px; padding-left:20px;">
  <li>Bookkeeping/ support and review bookkeeping as per defined chart of accounts</li>
  <li>Set up and Provide access to a remote resolution desk to resolve technical issues in accounting and statutory compliance matters for Producer Companies</li>
  <li>Free access to cloud-based accounting software</li>
</ul>

<p style="font-size:12px; font-weight: 700; text-decoration: underline; margin:15px 0 5px;">Statutory Compliances support</p>
<ul style="font-size:12px; margin:0 0 10px; padding-left:20px;">
  <li><strong>GST</strong>
    <ul style="list-style-type:circle;">
      <li>GSTR-1</li>
      <li>GSTR-3B</li>
      <li>GST Annual Return-9</li>
    </ul>
  </li>
  <li><strong>INCOME TAX</strong>
    <ul style="list-style-type:circle;">
      <li>Quarter TDS Return Filing</li>
      <li>Quarter Form 16A Issue</li>
      <li>Support Tax Audit where applicable</li>
      <li>Income Annual Tax Return</li>
    </ul>
  </li>
  <li><strong>COMPANY LAW</strong>
    <ul style="list-style-type:circle;">
      <li>Roc Annual Return Form MGT-7</li>
      <li>ADT - 1: Auditor Appointment</li>
      <li>KYC of the Company Director(s)</li>
      <li>DIR-12: Intimation for the Changing of Board Members</li>
      <li>ROC Annual Financial Statement Form AOC-4</li>
      <li>Board Meetings & AGM minutes</li>
      <li>Share Holders and Board Members updates</li>
      <li>Pass-3 Filing</li>
    </ul>
  </li>
  <li>Other laws compliance like PF, ESIC</li>
</ul>

<p style="font-size:12px; font-weight: 700; text-decoration: underline; margin:15px 0 5px;">Reporting and Management review support</p>
<ul style="font-size:12px; margin:0 0 10px; padding-left:20px;">
  <li>Monthly Management Report Sharing in pre agreed format</li>
  <li>Allotment of Shares and printing Share Certificates</li>
</ul>

<p style="font-size:12px; font-weight: 700; text-decoration: underline; margin:15px 0 5px;">Audit and Records keeping support</p>
<ul style="font-size:12px; margin:0 0 10px; padding-left:20px;">
  <li>Year-end Accounts Finalization</li>
  <li>Year-end Audit support Internal, Statutory and for Grants where applicable</li>
  <li>Documentation of Statutory Filings and Final and Audited Accounts</li>
</ul>
`;

  const handleSave = async () => {
    if (!iframeRef.current) return;
    
    setSaving(true);
    try {
      // Get the edited HTML from the iframe
      const doc = iframeRef.current.contentDocument;
      
      // Clone it to remove our editing-specific styles before saving
      const clone = doc.documentElement.cloneNode(true);
      const styles = clone.querySelectorAll('style');
      if (styles.length > 0) {
        // Remove the last style tag which we injected
        styles[styles.length - 1].remove(); 
      }
      
      const customHtml = '<!DOCTYPE html>\n' + clone.outerHTML;

      await api.patch(`/onboarding/${id}`, { 
        agreement_overrides: { custom_html: customHtml } 
      });
      toast.success('Agreement saved successfully!');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!window.confirm("This will finalize the agreement and email it to the client. Proceed?")) return;
    await handleSave(); // save any pending edits first
    try {
      await api.post(`/onboarding/${id}/approve`, { send_agreement: true });
      toast.success('Client activated and Agreement emailed!');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send agreement');
    }
  };

  // ── Reset to defaults ──────────────────────────────────────────────────
  const handleReset = async () => {
    if (!window.confirm('Reset all customizations and revert to the default template? This cannot be undone.')) return;
    await loadAgreement(true);
    toast.success('Reset to default template');
  };

  // ── Print ──────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    // Save first, then open
    await handleSave();
    window.open(`${API_BASE}/onboarding/${id}/agreement?token=${localStorage.getItem('merum_token')}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e8e6e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate(`/onboarding/${id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', color: '#666', cursor: 'pointer', fontSize: 13 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 7 }}>
              <FileSignature size={16} color="#C70073" />
              Agreement Editor — {onboarding?.company_name}
            </div>
            <div style={{ fontSize: 11.5, color: '#888', marginTop: 1 }}>
              Edit the document below directly. Click anywhere to type and make changes.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: '1px solid #ddd', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: '#e24b4a' }}
          >
            <RotateCcw size={13} /> Reset Template
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: '#333' }}
          >
            <Save size={13} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          {onboarding?.status === 'Pending Agreement Review' && (
            <button
              onClick={handleApproveAndSend}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#2d9d78', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#fff' }}
            >
              Approve & Send to Client
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'linear-gradient(135deg, #C70073, #9e005b)', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#fff' }}
          >
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </div>

      {/* ── Full Screen Editor ── */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#e8e6e0', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#888' }}>
            Loading Editor...
          </div>
        )}
        <iframe
          ref={iframeRef}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
            visibility: loading ? 'hidden' : 'visible'
          }}
          title="Agreement Editor"
        />
      </div>
    </div>
  );
}
