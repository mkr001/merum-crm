// src/pages/AgreementEditor.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Printer, RotateCcw, Plus, Trash2,
  ChevronDown, ChevronUp, FileSignature
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DEFAULT_SERVICE_LEVELS = [
  { component: 'Monthly financial reports', target: 'Delivered by the 8th working day of each month' },
  { component: 'Turnaround time for accounting', target: 'Within 2 business days' },
  { component: 'Finalized year end Accounts', target: 'Within 60 days of Financial Year end' },
  { component: 'Query Response Time', target: 'Within 1 business day' },
  { component: 'Statutory Compliances', target: 'Before the time limits prescribed by corresponding Laws' },
];

const DEFAULT_RESPONSIBILITIES = [
  'Provide daily transaction updates through the pre-designed sheet before the 2nd business day of the following month.',
  'Notify changes in Directors, key personnel or regulatory status within 7 days.',
  'Notify of general/board meetings at least 7 days in advance.',
  'Provide joining/resignation updates for payroll staff within 7 days.',
  'Furnish all physical/digital copy supporting documents for accounting and validation.',
  'Approve deliverables within 5 working days of submission.',
];

// ── Collapsible Section ────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #e8e6e0', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '11px 16px', background: '#f8f7f4', border: 'none', cursor: 'pointer',
          fontSize: 12.5, fontWeight: 700, color: '#333', textAlign: 'left'
        }}
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div style={{ padding: '16px' }}>{children}</div>}
    </div>
  );
}

// ── Field helpers ──────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #ddd',
  borderRadius: 7, fontSize: 13, boxSizing: 'border-box',
  outline: 'none', background: '#fff'
};
const labelStyle = { display: 'block', fontSize: 11.5, fontWeight: 600, color: '#555', marginBottom: 4 };
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════
export default function AgreementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const iframeRef = useRef(null);
  const previewTimeout = useRef(null);

  // ── Overrides state ────────────────────────────────────────────────────
  const [overrides, setOverrides] = useState({
    effective_date: '',
    master_agreement_ref: 'Transforming Rural India Foundation',
    master_agreement_date: '01st February 2026',
    monthly_fee: '15,000',
    fee_text: 'Monthly Fee of INR 15,000/- plus applicable GST.',
    merum_signatory_name: 'Arvind Tripathi',
    merum_signatory_title: 'Director',
    client_signatory_name: '',
    client_signature_name: '',
    client_signatory_title: '',
    service_levels: DEFAULT_SERVICE_LEVELS.map(sl => ({ ...sl })),
    client_responsibilities: [...DEFAULT_RESPONSIBILITIES],
    custom_clauses: [],
  });

  // ── Load record ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/onboarding/${id}`);
        const rec = data.onboarding;
        setOnboarding(rec);
        // Merge saved overrides over defaults
        const saved = rec.agreement_overrides || {};
        setOverrides(prev => ({
          ...prev,
          effective_date: saved.effective_date || rec.auth_date?.slice(0, 10) || '',
          client_signatory_name: saved.client_signatory_name || rec.authorized_signatory || '',
          client_signature_name: saved.client_signature_name || rec.signature_name || '',
          client_signatory_title: saved.client_signatory_title || rec.designation_auth || '',
          ...(saved.master_agreement_ref   && { master_agreement_ref:   saved.master_agreement_ref }),
          ...(saved.master_agreement_date  && { master_agreement_date:  saved.master_agreement_date }),
          ...(saved.monthly_fee            && { monthly_fee:            saved.monthly_fee }),
          ...(saved.fee_text               && { fee_text:               saved.fee_text }),
          ...(saved.merum_signatory_name   && { merum_signatory_name:   saved.merum_signatory_name }),
          ...(saved.merum_signatory_title  && { merum_signatory_title:  saved.merum_signatory_title }),
          ...(saved.service_levels         && saved.service_levels.length > 0 && { service_levels: saved.service_levels }),
          ...(saved.client_responsibilities && saved.client_responsibilities.length > 0 && { client_responsibilities: saved.client_responsibilities }),
          ...(saved.custom_clauses         && { custom_clauses: saved.custom_clauses }),
        }));
      } catch {
        toast.error('Failed to load onboarding record');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Live preview — debounced fetch ─────────────────────────────────────
  const refreshPreview = useCallback(() => {
    clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        // Save overrides temporarily in local state, then fetch preview
        const resp = await fetch(`${API_BASE}/onboarding/${id}/agreement?preview=1`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('merum_token')}`
          },
          body: JSON.stringify({ overrides })
        });
        if (resp.ok) {
          const html = await resp.text();
          setPreviewHtml(html);
        }
      } catch {
        // silent fail on preview
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
  }, [id, overrides]);

  useEffect(() => {
    if (onboarding) refreshPreview();
  }, [overrides, onboarding]);

  // ── Setters ────────────────────────────────────────────────────────────
  const set = (key, value) => setOverrides(prev => ({ ...prev, [key]: value }));

  const setServiceLevel = (idx, field, value) => {
    const arr = overrides.service_levels.map((sl, i) => i === idx ? { ...sl, [field]: value } : sl);
    set('service_levels', arr);
  };
  const addServiceLevel = () => set('service_levels', [...overrides.service_levels, { component: '', target: '' }]);
  const removeServiceLevel = (idx) => set('service_levels', overrides.service_levels.filter((_, i) => i !== idx));

  const setResponsibility = (idx, value) => {
    const arr = overrides.client_responsibilities.map((r, i) => i === idx ? value : r);
    set('client_responsibilities', arr);
  };
  const addResponsibility = () => set('client_responsibilities', [...overrides.client_responsibilities, '']);
  const removeResponsibility = (idx) => set('client_responsibilities', overrides.client_responsibilities.filter((_, i) => i !== idx));

  const setClause = (idx, field, value) => {
    const arr = overrides.custom_clauses.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    set('custom_clauses', arr);
  };
  const addClause = () => set('custom_clauses', [...overrides.custom_clauses, { number: `${12 + overrides.custom_clauses.length}`, title: '', text: '' }]);
  const removeClause = (idx) => set('custom_clauses', overrides.custom_clauses.filter((_, i) => i !== idx));

  // ── Save overrides to DB ───────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/onboarding/${id}`, { agreement_overrides: overrides });
      toast.success('Agreement draft saved!');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset to defaults ──────────────────────────────────────────────────
  const handleReset = async () => {
    if (!window.confirm('Reset all agreement customizations to default values?')) return;
    await api.patch(`/onboarding/${id}`, { agreement_overrides: {} });
    const rec = onboarding;
    setOverrides({
      effective_date: rec.auth_date?.slice(0, 10) || '',
      master_agreement_ref: 'Transforming Rural India Foundation',
      master_agreement_date: '01st February 2026',
      monthly_fee: '15,000',
      fee_text: 'Monthly Fee of INR 15,000/- plus applicable GST.',
      merum_signatory_name: 'Arvind Tripathi',
      merum_signatory_title: 'Director',
      client_signatory_name: rec.authorized_signatory || '',
      client_signature_name: rec.signature_name || '',
      client_signatory_title: rec.designation_auth || '',
      service_levels: DEFAULT_SERVICE_LEVELS.map(sl => ({ ...sl })),
      client_responsibilities: [...DEFAULT_RESPONSIBILITIES],
      custom_clauses: [],
    });
    toast.success('Reset to defaults');
  };

  // ── Print ──────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    // Save first, then open
    setSaving(true);
    try {
      await api.patch(`/onboarding/${id}`, { agreement_overrides: overrides });
    } catch {}
    setSaving(false);
    window.open(`${API_BASE}/onboarding/${id}/agreement?token=${localStorage.getItem('merum_token')}`, '_blank');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888' }}>
      Loading agreement...
    </div>
  );

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
              Edit the agreement letter before printing. Changes are saved per client.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: '1px solid #ddd', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: '#666' }}
          >
            <RotateCcw size={13} /> Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: '#333' }}
          >
            <Save size={13} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'linear-gradient(135deg, #C70073, #9e005b)', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#fff' }}
          >
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </div>

      {/* ── Split Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — Edit Form */}
        <div style={{ overflowY: 'auto', padding: '20px 16px', background: '#f8f7f4', borderRight: '1px solid #e8e6e0' }}>

          {/* General */}
          <Section title="📅 General / Header" defaultOpen={true}>
            <Field label="Effective Date">
              <input type="date" style={inputStyle} value={overrides.effective_date} onChange={e => set('effective_date', e.target.value)} />
            </Field>
            <Field label="Master Agreement Reference (Organization Name)">
              <input style={inputStyle} value={overrides.master_agreement_ref} onChange={e => set('master_agreement_ref', e.target.value)} />
            </Field>
            <Field label="Master Agreement Date">
              <input style={inputStyle} value={overrides.master_agreement_date} onChange={e => set('master_agreement_date', e.target.value)} placeholder="e.g. 01st February 2026" />
            </Field>
          </Section>

          {/* Fees */}
          <Section title="💰 Fees & Commercials">
            <Field label="Monthly Fee Amount (₹)">
              <input style={inputStyle} value={overrides.monthly_fee} onChange={e => {
                set('monthly_fee', e.target.value);
                set('fee_text', `Monthly Fee of INR ${e.target.value}/- plus applicable GST.`);
              }} placeholder="e.g. 15,000" />
            </Field>
            <Field label="Full Fee Description Text">
              <textarea
                style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                value={overrides.fee_text}
                onChange={e => set('fee_text', e.target.value)}
              />
            </Field>
          </Section>

          {/* Merum Signatory */}
          <Section title="🏢 Merum Signatory">
            <Field label="Signatory Name">
              <input style={inputStyle} value={overrides.merum_signatory_name} onChange={e => set('merum_signatory_name', e.target.value)} />
            </Field>
            <Field label="Title / Designation">
              <input style={inputStyle} value={overrides.merum_signatory_title} onChange={e => set('merum_signatory_title', e.target.value)} />
            </Field>
          </Section>

          {/* Client Signatory */}
          <Section title="👤 Client Signatory">
            <Field label="Authorized Signatory Name">
              <input style={inputStyle} value={overrides.client_signatory_name} onChange={e => set('client_signatory_name', e.target.value)} />
            </Field>
            <Field label="Signature (typed name)">
              <input style={{ ...inputStyle, fontFamily: 'cursive', fontSize: 15 }} value={overrides.client_signature_name} onChange={e => set('client_signature_name', e.target.value)} />
            </Field>
            <Field label="Designation">
              <input style={inputStyle} value={overrides.client_signatory_title} onChange={e => set('client_signatory_title', e.target.value)} placeholder="Director / Partner" />
            </Field>
          </Section>

          {/* Service Levels */}
          <Section title="📊 Service Levels Table">
            {overrides.service_levels.map((sl, idx) => (
              <div key={idx} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>Row {idx + 1}</span>
                  <button onClick={() => removeServiceLevel(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e24b4a', padding: 2 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Service Component" value={sl.component} onChange={e => setServiceLevel(idx, 'component', e.target.value)} />
                <input style={inputStyle} placeholder="Service Level Target" value={sl.target} onChange={e => setServiceLevel(idx, 'target', e.target.value)} />
              </div>
            ))}
            <button onClick={addServiceLevel} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 12px', border: '1px dashed #C70073', borderRadius: 7, background: '#fff9fb', color: '#C70073', fontSize: 12, fontWeight: 600, cursor: 'pointer', justifyContent: 'center' }}>
              <Plus size={13} /> Add Row
            </button>
          </Section>

          {/* Client Responsibilities */}
          <Section title="📋 Client Responsibilities">
            {overrides.client_responsibilities.map((r, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: '#888', marginTop: 9, minWidth: 18 }}>{idx + 1}.</span>
                <textarea
                  style={{ ...inputStyle, minHeight: 52, resize: 'vertical', flex: 1 }}
                  value={r}
                  onChange={e => setResponsibility(idx, e.target.value)}
                />
                <button onClick={() => removeResponsibility(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e24b4a', marginTop: 8 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button onClick={addResponsibility} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 12px', border: '1px dashed #C70073', borderRadius: 7, background: '#fff9fb', color: '#C70073', fontSize: 12, fontWeight: 600, cursor: 'pointer', justifyContent: 'center' }}>
              <Plus size={13} /> Add Responsibility
            </button>
          </Section>

          {/* Custom Clauses */}
          <Section title="📝 Custom Clauses (Beyond Clause 11)" defaultOpen={false}>
            <p style={{ fontSize: 11.5, color: '#888', margin: '0 0 12px', lineHeight: 1.5 }}>
              Add additional clauses that will appear on Page 3 after Clause 11, before the signature block.
            </p>
            {overrides.custom_clauses.map((c, idx) => (
              <div key={idx} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Custom Clause {idx + 1}</span>
                  <button onClick={() => removeClause(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e24b4a', padding: 2 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={labelStyle}>Number</label>
                    <input style={inputStyle} value={c.number} onChange={e => setClause(idx, 'number', e.target.value)} placeholder="12" />
                  </div>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input style={inputStyle} value={c.title} onChange={e => setClause(idx, 'title', e.target.value)} placeholder="Special Terms" />
                  </div>
                </div>
                <label style={labelStyle}>Clause Text</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  value={c.text}
                  onChange={e => setClause(idx, 'text', e.target.value)}
                  placeholder="Enter the full text of this clause..."
                />
              </div>
            ))}
            <button onClick={addClause} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 12px', border: '1px dashed #534ab7', borderRadius: 7, background: '#f0effd', color: '#534ab7', fontSize: 12, fontWeight: 600, cursor: 'pointer', justifyContent: 'center' }}>
              <Plus size={13} /> Add Custom Clause
            </button>
          </Section>

        </div>

        {/* RIGHT — Live Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e8e6e0' }}>
          <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e8e6e0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>📄 Live Preview</span>
            {previewLoading && <span style={{ fontSize: 11, color: '#C70073', fontWeight: 600 }}>Refreshing...</span>}
            <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>Preview updates automatically as you edit</span>
          </div>
          {previewHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              style={{ flex: 1, border: 'none', width: '100%' }}
              title="Agreement Preview"
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#aaa' }}>
              <FileSignature size={36} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13 }}>Preview will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
