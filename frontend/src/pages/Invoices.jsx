// src/pages/Invoices.jsx
import { useEffect, useState, useMemo } from 'react';
import { Plus, Printer, Download, Eye, IndianRupee, FileText, X, Trash2, Upload, Edit2, Search, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import useResponsive from '../utils/useResponsive';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLE = {
  draft:    { bg: '#f8f7f4', color: '#888' },
  sent:     { bg: '#eeedfe', color: '#534ab7' },
  paid:     { bg: '#eaf3de', color: '#3b6d11' },
  overdue:  { bg: '#fcebeb', color: '#a32d2d' },
  cancelled:{ bg: '#f8f7f4', color: '#aaa' },
};

// ── Number to Words Helper ─────────────────────────────────────
function numberToWords(num) {
  if (num === 0) return 'ZERO ONLY';
  const a = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
  const b = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];
  let n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' CRORE ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' LAKH ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' THOUSAND ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' HUNDRED ' : '';
  str += (n[5] != 0) ? (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + ' ' : '';
  return str.trim() + ' ONLY.';
}

// ── Invoice Template (Reusable for Single & Bulk) ───────────────
function InvoiceTemplate({ invoice }) {
  const dateStr = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  // Show decimals only when non-zero (1800.00 → "1800", 4.50 → "4.50")
  const fmtAmt = (n) => { const v = Number(n); return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(2); };
  const taxRate = Number(invoice.tax_rate) || 18;
  const halfTax = taxRate / 2;
  const halfTaxAmount = fmtAmt(Number(invoice.tax_amount) / 2);
  const igstAmount = fmtAmt(Number(invoice.tax_amount));
  // Intra-state (Delhi) → CGST+SGST; inter-state (any other state) → IGST
  const clientState = (invoice.clients?.state || '').toLowerCase().trim();
  const isIntraState = !clientState || clientState.includes('delhi');

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: 12, background: '#fff' }}>
      {/* Logo Section */}
      <div style={{ marginBottom: 10 }}>
        <img src="/logo.png" alt="Merum Logo" style={{ height: 80, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
        <div style={{ display: 'none', fontSize: 24, fontWeight: 'bold' }}>
          Merum<br/><span style={{ fontSize: 12, fontWeight: 'normal' }}>Shared Services Pvt. Ltd.</span>
        </div>
      </div>

      {/* Invoice Header Border Box */}
      <div style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>
        {invoice.status === 'paid' ? 'Tax Invoice' : 'Proforma Invoice'}_{invoice.invoice_number.split('-').pop()} / {new Date().getFullYear()}-{String(new Date().getFullYear()+1).slice(2)} Dated {dateStr(invoice.issue_date)}
      </div>

      {/* Bill To Box */}
      <div style={{ border: '1px solid #000', padding: '8px', marginBottom: 10 }}>
        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>{invoice.clients?.org_name}</div>
        <div style={{ marginBottom: 2 }}><b>ADDRESS:-</b> {invoice.clients?.address || 'N/A'}, {invoice.clients?.city || ''}, {invoice.clients?.state || ''}, {invoice.clients?.pincode || ''}</div>
        <div><b>GSTIN:-</b> {invoice.clients?.gstin || 'N/A'}</div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000', padding: '6px', width: '50px', textAlign: 'center' }}>S.NO</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>PARTICULAR</th>
            <th style={{ border: '1px solid #000', padding: '6px', width: '120px', textAlign: 'center' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {/* One <tr> per item so each amount sits exactly beside its item name */}
          {invoice.invoice_items?.map((item, i) => (
            <tr key={item.id || i}>
              <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'top', width: '50px' }}>
                {i + 1}
              </td>
              <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '6px 6px 4px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.services?.name || 'PROFESSIONAL FEE'}</div>
                <div style={{ marginLeft: 20 }}>{item.description}</div>
              </td>
              <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '6px', textAlign: 'right', verticalAlign: 'top', width: '120px' }}>
                {fmtAmt(item.line_total)}
              </td>
            </tr>
          ))}
          {/* Tax rows: CGST+SGST for Delhi (intra-state), IGST for other states (inter-state) */}
          {isIntraState ? (
            <>
              <tr>
                <td style={{ border: 'none', padding: '4px 6px' }}></td>
                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>CGST@{halfTax}%</td>
                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{halfTaxAmount}</td>
              </tr>
              <tr>
                <td style={{ border: 'none', padding: '4px 6px' }}></td>
                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>SGST@{halfTax}%</td>
                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{halfTaxAmount}</td>
              </tr>
            </>
          ) : (
            <tr>
              <td style={{ border: 'none', padding: '4px 6px' }}></td>
              <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>IGST@{taxRate}%</td>
              <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{igstAmount}</td>
            </tr>
          )}
          <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
            <td style={{ border: 'none', padding: '6px' }}></td>
            <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>TOTAL</td>
            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{fmtAmt(invoice.total_amount)}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline' }}>
              RUPEES IN WORD :- {numberToWords(Math.round(invoice.total_amount))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature and T&C */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
        <div style={{ alignSelf: 'flex-end', textAlign: 'center', fontSize: 11, marginBottom: 20 }}>
          <div>FOR MERUM SHARED SERVICES PRIVATE LIMITED</div>
          <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/stamp.png" alt="Merum Stamp" style={{ height: 90, width: 90, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div style={{ display: 'none', width: 80, height: 80, border: '2px dashed #aaa', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 10, opacity: 0.5 }}>Stamp</div>
          </div>
          <div>(Authorised Signatory)</div>
        </div>
        <div style={{ fontSize: 10, lineHeight: 1.5 }}>
          <div>(WE THANK YOU FOR AVAILING OUR SERVICES)</div>
          <div>1. Payments may please be made within 30 days by account payee cheque or draft payable at New Delhi or transfer Details given below:</div>
          <div>2. Our GSTIN No. 07AATCM6426C1ZB</div>
          <div>3. Our PAN No. Is AATCM6426C</div>
          <div>4. For delayed payment we may be constrained to charge an interest @ 24% p.a.</div>
          <div>5. Deductions, if any, on account of statutory payments such as Tax Deduction at Source Should be accompanied by appropriate Tax Deduction at Source Certificate in Form 16 mentioning PAN (All disputes are subject to Delhi courts only.)</div>
        </div>
      </div>

      {/* Bank Details Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 10, marginBottom: 20, textAlign: 'center' }}>
        <thead>
          <tr style={{ fontWeight: 'bold' }}>
            <th style={{ border: '1px solid #000', padding: '6px' }}>S.No</th>
            <th style={{ border: '1px solid #000', padding: '6px' }}>NAME OF BENEFICIARY'S<br/>ACCOUNT</th>
            <th style={{ border: '1px solid #000', padding: '6px' }}>BENEFICIARY'S BANK<br/>NAME AND BRANCH</th>
            <th style={{ border: '1px solid #000', padding: '6px' }}>IFSC CODE</th>
            <th style={{ border: '1px solid #000', padding: '6px' }}>BANK ACCOUNT NUMBER</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '10px 6px', fontWeight: 'bold' }}>01</td>
            <td style={{ border: '1px solid #000', padding: '10px 6px', fontWeight: 'bold' }}>MERUM SHARED SERVICES<br/>PRIVATE LIMITED</td>
            <td style={{ border: '1px solid #000', padding: '10px 6px', fontWeight: 'bold' }}>Kotak Mahindra bank<br/>and Mahipalpur,<br/>Delhi, New Delhi<br/>110037.</td>
            <td style={{ border: '1px solid #000', padding: '10px 6px', fontWeight: 'bold' }}>KKBK0004684</td>
            <td style={{ border: '1px solid #000', padding: '10px 6px', fontWeight: 'bold' }}>9451163128</td>
          </tr>
        </tbody>
      </table>

      {/* Footer Address */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 10, textAlign: 'center' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', width: '33%' }}>
              Reg Office Address: - SHOP No 24<br/>GROUND FLOOR, DDA SHOP NEETI BAGH<br/>110049.
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', width: '33%' }}>
              Email ID: - contact_support@merums.com<br/>Contact No: - 8383977818
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', width: '33%' }}>
              CIN No.:<br/>U70200DL2025PTC452136<br/>Website: merums.com
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Invoice Print View ─────────────────────────────────────────
function InvoicePrintView({ invoice, onClose }) {
  const handlePrint = () => window.print();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, overflowY: 'auto', padding: '20px' }}>
      <div style={{ background: '#fff', width: 800, borderRadius: 0, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a18', borderBottom: '1px solid #333' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Invoice Preview</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Printer size={14} /> Print / Save PDF
            </button>
            <button onClick={onClose} style={{ padding: '7px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div id="invoice-print">
          <InvoiceTemplate invoice={invoice} />
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: fixed; top: 0; left: 0; width: 100%; margin: 0; padding: 20px !important; box-sizing: border-box; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0mm; }
        }
      `}</style>
    </div>
  );
}

// ── Bulk PDF Generator ─────────────────────────────────────────
function BulkPDFGenerator({ invoices, onClose }) {
  useEffect(() => {
    if (invoices && invoices.length > 0) {
      const generate = async () => {
        toast.loading(`Downloading ${invoices.length} PDFs...`, { id: 'gen-pdf' });
        for (let i = 0; i < invoices.length; i++) {
          const inv = invoices[i];
          const element = document.getElementById(`invoice-pdf-${inv.id}`);
          if (!element) continue;
          const clientName = inv.clients?.org_name?.replace(/[^a-z0-9]/gi, '_') || 'Client';
          const opt = {
            margin:       0,
            filename:     `${clientName}_${inv.invoice_number}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          await html2pdf().set(opt).from(element).save();
        }
        toast.success('All PDFs downloaded!', { id: 'gen-pdf' });
        onClose();
      };
      
      setTimeout(generate, 500);
    }
  }, [invoices, onClose]);

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
      {invoices.map(inv => (
        <div key={inv.id} id={`invoice-pdf-${inv.id}`} style={{ width: '210mm', minHeight: '297mm', background: 'white' }}>
          <InvoiceTemplate invoice={inv} />
        </div>
      ))}
    </div>
  );
}

// ── Edit Invoice Modal ─────────────────────────────────────────
function EditInvoiceModal({ invoice, onClose, onSave }) {
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    client_id: invoice.client_id || invoice.clients?.id || '',
    due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
    notes: invoice.notes || '',
    status: invoice.status || 'draft',
    tax_rate: invoice.tax_rate || 18
  });
  const [items, setItems] = useState(
    invoice.invoice_items?.length > 0
      ? invoice.invoice_items.map(it => ({
          description: it.description || '',
          quantity: it.quantity || 1,
          unit_price: it.unit_price || '',
          service_id: it.service_id || ''
        }))
      : [{ description: '', quantity: 1, unit_price: '', service_id: '' }]
  );
  const [saving, setSaving] = useState(false);

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };

  useEffect(() => {
    // Fetch both onboarded and offboard clients so the dropdown covers all invoice clients
    Promise.all([
      api.get('/clients'),
      api.get('/clients', { params: { is_offboard: true } }),
    ]).then(([r1, r2]) => {
      const all = [...(r1.data.data || []), ...(r2.data.data || [])];
      setClients(all);
    });
    api.get('/services').then(r => setServices(r.data.data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: '', service_id: '' }]);
  const removeItem = i => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleServiceSelect = (i, serviceId) => {
    if (serviceId === 'other') {
      setItem(i, 'service_id', '');
      setItem(i, 'description', '');
      setItem(i, 'unit_price', '');
      return;
    }
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      setItem(i, 'service_id', serviceId);
      setItem(i, 'description', svc.name);
      setItem(i, 'unit_price', svc.base_price);
    } else {
      setItem(i, 'service_id', '');
    }
  };

  const handleSave = async () => {
    if (!form.client_id) return toast.error('Please select a client');
    if (items.some(it => !it.description || !it.unit_price)) return toast.error('Fill in all item descriptions and prices');
    setSaving(true);
    try {
      const payload = {
        ...form,
        items: items.map(it => ({
          service_id: it.service_id || null,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price),
          line_total: (Number(it.quantity) || 1) * Number(it.unit_price)
        }))
      };
      await api.patch(`/invoices/${invoice.id}`, payload);
      toast.success('Invoice updated successfully!');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 680, padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>Edit Invoice ({invoice.invoice_number})</h2>
        {/* Client & Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Client *</label>
            <select style={inputStyle} value={form.client_id} onChange={e => set('client_id', e.target.value)}>
              <option value="">-- Select Client --</option>
              {clients.map(c => (<option key={c.id} value={c.id}>{c.org_name}</option>))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input type="date" style={inputStyle} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        {/* Line Items */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...labelStyle, margin: 0 }}>Invoice Items *</label>
            <button onClick={addItem} style={{ fontSize: 12, color: '#2d9d78', border: '1px solid #2d9d78', background: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>+ Add Item</button>
          </div>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 32px', gap: 6, marginBottom: 6 }}>
            {['Description', 'Qty', 'Unit Price (₹)', ''].map(h => (<div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>{h}</div>))}
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 32px', gap: 6, marginBottom: 6 }}>
              <div>
                {services.length > 0 && (
                  <select style={{ ...inputStyle, marginBottom: 4, fontSize: 11, padding: '6px 8px', color: '#888' }}
                    value={item.service_id} onChange={e => handleServiceSelect(i, e.target.value)}>
                    <option value="">Pick from services…</option>
                    {services.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    <option value="other">Other (Custom)</option>
                  </select>
                )}
                <input style={inputStyle} placeholder="Description" value={item.description}
                  onChange={e => setItem(i, 'description', e.target.value)} />
              </div>
              <input style={inputStyle} type="number" placeholder="1" min="1" value={item.quantity}
                onChange={e => setItem(i, 'quantity', e.target.value)} />
              <input style={inputStyle} type="number" placeholder="0.00" value={item.unit_price}
                onChange={e => setItem(i, 'unit_price', e.target.value)} />
              <button onClick={() => removeItem(i)} disabled={items.length === 1}
                style={{ border: 'none', background: 'none', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: '#e24b4a', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        {/* Totals */}
        <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#666' }}>
            <span>Subtotal</span>
            <span>{`₹${items.reduce((s, it) => s + ((Number(it.quantity)||0)*(Number(it.unit_price)||0)),0).toLocaleString('en-IN')}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>GST</span>
              <input type="number" value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)}
                style={{ width: 55, padding: '3px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }} />
              <span style={{ fontSize: 12, color: '#888' }}>%</span>
            </div>
            <span style={{ fontSize: 13, color: '#666' }}>{`₹${(items.reduce((s, it) => s + ((Number(it.quantity)||0)*(Number(it.unit_price)||0)),0) * ((Number(form.tax_rate)||18) / 100)).toLocaleString('en-IN')}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e8e6e0', fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>
            <span>Total</span>
            <span style={{ color: '#2d9d78' }}>{`₹${(items.reduce((s, it) => s + ((Number(it.quantity)||0)*(Number(it.unit_price)||0)),0) * (1 + (Number(form.tax_rate)||18) / 100)).toLocaleString('en-IN')}`}</span>
          </div>
        </div>
        {/* Notes */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 22px', background: saving ? '#aaa' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}







// ── Create Invoice Modal ───────────────────────────────────────
function CreateInvoiceModal({ onClose, onSave }) {
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ client_id: '', new_client_name: '', due_date: '', tax_rate: 18, notes: '', status: 'draft' });
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: '', service_id: '' }]);
  const [saving, setSaving] = useState(false);

  // Client combobox state
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [pendingOffboardName, setPendingOffboardName] = useState('');
  const [showOffboardConfirm, setShowOffboardConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [offboardDetails, setOffboardDetails] = useState({ gstin: '', address: '', city: '', state: '', pincode: '' });
  const setOD = (k, v) => setOffboardDetails(d => ({ ...d, [k]: v }));

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data.data || []));
    api.get('/services').then(r => setServices(r.data.data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (i, k, v) => setItems(items.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: '', service_id: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)), 0);
  const taxAmt   = subtotal * (Number(form.tax_rate) || 18) / 100;
  const total    = subtotal + taxAmt;
  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Client combobox helpers
  const filteredClients = clientSearch.trim()
    ? clients.filter(c => c.org_name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 10)
    : clients.slice(0, 10);

  const exactMatch = clients.some(c => c.org_name.toLowerCase() === clientSearch.trim().toLowerCase());

  const handleClientInputChange = (val) => {
    setClientSearch(val);
    setShowClientDropdown(true);
    set('client_id', '');
    set('new_client_name', '');
    setSelectedClient(null);
  };

  const handleClientSelect = (client) => {
    set('client_id', client.id);
    set('new_client_name', '');
    setClientSearch(client.org_name);
    setShowClientDropdown(false);
    setSelectedClient(client);
    setOffboardDetails({ gstin: '', address: '', city: '', state: '', pincode: '' });
  };

  const handleOffboardOption = () => {
    setPendingOffboardName(clientSearch.trim());
    setShowOffboardConfirm(true);
    setShowClientDropdown(false);
  };

  const confirmOffboard = () => {
    set('client_id', '');
    set('new_client_name', pendingOffboardName);
    setSelectedClient(null);
    setShowOffboardConfirm(false);
  };

  const clearOffboardClient = () => {
    set('new_client_name', '');
    set('client_id', '');
    setClientSearch('');
    setOffboardDetails({ gstin: '', address: '', city: '', state: '', pincode: '' });
  };

  const handleServiceSelect = (i, serviceId) => {
    if (serviceId === 'other') {
      setItems(items.map((it, idx) => idx === i ? {
        ...it, service_id: '',
        description: '',
        unit_price: ''
      } : it));
      return;
    }
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      setItems(items.map((it, idx) => idx === i ? {
        ...it, service_id: serviceId,
        description: svc.name,
        unit_price: svc.base_price
      } : it));
    } else {
      setItems(items.map((it, idx) => idx === i ? { ...it, service_id: '' } : it));
    }
  };

  const handleSave = async () => {
    if (!form.client_id && !form.new_client_name) return toast.error('Please select or enter a client');
    if (items.some(it => !it.description || !it.unit_price)) return toast.error('Fill in all item descriptions and prices');

    setSaving(true);
    try {
      const payload = {
        ...form,
        ...(form.new_client_name ? {
          new_client_gstin:   offboardDetails.gstin   || null,
          new_client_address: offboardDetails.address || null,
          new_client_city:    offboardDetails.city    || null,
          new_client_state:   offboardDetails.state   || null,
          new_client_pincode: offboardDetails.pincode || null,
        } : {}),
        items: items.map(it => ({
          service_id: it.service_id || null,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price),
          line_total: (Number(it.quantity) || 1) * Number(it.unit_price)
        }))
      };
      if (!payload.client_id) delete payload.client_id;
      if (!payload.new_client_name) delete payload.new_client_name;
      await api.post('/invoices', payload);
      toast.success('Invoice created successfully!');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create invoice. Please try again.');
    } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px 12px' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, padding: '24px 20px', marginTop: 20 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>Create New Invoice</h2>

        {/* Offboard Confirmation Popup */}
        {showOffboardConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: 420, padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>Client Not Onboarded</h3>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#333' }}>
                <b>"{pendingOffboardName}"</b> is not an onboarded client in the system.
              </p>
              <p style={{ margin: '0 0 22px', fontSize: 13, color: '#888' }}>
                You can still create this invoice. The client will be saved as an <b>offboard client</b> and can be fully onboarded later from the Clients module.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowOffboardConfirm(false)} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmOffboard} style={{ padding: '9px 20px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Create as Offboard Client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client & Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/-1', position: 'relative' }}>
            <label style={labelStyle}>Client *</label>

            {/* Offboard client banner */}
            {form.new_client_name && (
              <div style={{ marginBottom: 6, padding: '7px 12px', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 8, fontSize: 12, color: '#e65100', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠️ Creating as <b style={{ marginLeft: 3 }}>offboard client</b>: {form.new_client_name}
                <button onMouseDown={clearOffboardClient} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#e65100', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}

            <input
              style={{ ...inputStyle, borderColor: form.new_client_name ? '#ffb74d' : '#ddd' }}
              placeholder="Search or type client name…"
              value={form.new_client_name ? form.new_client_name : clientSearch}
              onChange={e => { if (!form.new_client_name) handleClientInputChange(e.target.value); }}
              onFocus={() => { if (!form.new_client_name) setShowClientDropdown(true); }}
              onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
              readOnly={!!form.new_client_name}
            />

            {showClientDropdown && !form.new_client_name && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.1)', zIndex: 200, maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                {filteredClients.map(c => (
                  <div key={c.id} onMouseDown={() => handleClientSelect(c)}
                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f5f5f5', color: '#333' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f7f4'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    {c.org_name}
                  </div>
                ))}
                {clientSearch.trim() && !exactMatch && (
                  <div onMouseDown={handleOffboardOption}
                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#e65100', fontWeight: 600, background: '#fff8f0', display: 'flex', alignItems: 'center', gap: 6, borderTop: filteredClients.length ? '1px solid #ffe0b2' : 'none' }}>
                    ⚠️ Create "{clientSearch.trim()}" as offboard client
                  </div>
                )}
                {!clientSearch.trim() && filteredClients.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#aaa', textAlign: 'center' }}>No clients found</div>
                )}
              </div>
            )}
          </div>

          {/* Existing client: show their GST + address so user can confirm what appears on invoice */}
          {selectedClient && (
            <div style={{ gridColumn: '1/-1', background: '#f0f7ff', border: '1px solid #b3d4f5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1a4f7a' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Details that will appear on invoice</div>
              <div>GSTIN: {selectedClient.gstin || <span style={{ color: '#aaa' }}>Not set — edit client to add</span>}</div>
              <div style={{ marginTop: 3 }}>Address: {[selectedClient.address, selectedClient.city, selectedClient.state, selectedClient.pincode].filter(Boolean).join(', ') || <span style={{ color: '#aaa' }}>Not set — edit client to add</span>}</div>
            </div>
          )}

          {/* Offboard client: optional GST + address fields */}
          {form.new_client_name && (
            <div style={{ gridColumn: '1/-1', background: '#fffbf5', border: '1px solid #ffe0b2', borderRadius: 8, padding: '14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e65100', marginBottom: 10 }}>Client Details — optional (will appear on invoice)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>GST Number</label>
                  <input style={inputStyle} placeholder="e.g. 07AATCM6426C1ZB" value={offboardDetails.gstin} onChange={e => setOD('gstin', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Address</label>
                  <input style={inputStyle} placeholder="Street / locality" value={offboardDetails.address} onChange={e => setOD('address', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} placeholder="City" value={offboardDetails.city} onChange={e => setOD('city', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <input style={inputStyle} placeholder="State" value={offboardDetails.state} onChange={e => setOD('state', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Pincode</label>
                  <input style={inputStyle} placeholder="110001" value={offboardDetails.pincode} onChange={e => setOD('pincode', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Due Date</label>
            <input type="date" style={inputStyle} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
            </select>
          </div>
        </div>

        {/* Line Items */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...labelStyle, margin: 0 }}>Invoice Items *</label>
            <button onClick={addItem} style={{ fontSize: 12, color: '#2d9d78', border: '1px solid #2d9d78', background: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
              + Add Item
            </button>
          </div>

          {/* Items Header - hidden on mobile */}
          <div className="res-invoice-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 32px', gap: 6, marginBottom: 6 }}>
            {['Description', 'Qty', 'Unit Price (₹)', ''].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>{h}</div>
            ))}
          </div>

          {items.map((item, i) => (
            <div key={i} className="res-invoice-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 32px', gap: 6, marginBottom: 6 }}>
              <div>
                {services.length > 0 && (
                  <select style={{ ...inputStyle, marginBottom: 4, fontSize: 11, padding: '6px 8px', color: '#888' }}
                    value={item.service_id} onChange={e => handleServiceSelect(i, e.target.value)}>
                    <option value="">Pick from services…</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="other">Other (Custom)</option>
                  </select>
                )}
                <input style={inputStyle} placeholder="Description" value={item.description}
                  onChange={e => setItem(i, 'description', e.target.value)} />
              </div>
              <input style={inputStyle} type="number" placeholder="1" min="1" value={item.quantity}
                onChange={e => setItem(i, 'quantity', e.target.value)} />
              <input style={inputStyle} type="number" placeholder="0.00" value={item.unit_price}
                onChange={e => setItem(i, 'unit_price', e.target.value)} />
              <button onClick={() => removeItem(i)} disabled={items.length === 1}
                style={{ border: 'none', background: 'none', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: '#e24b4a', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#666' }}>
            <span>Subtotal</span><span>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>GST</span>
              <input type="number" value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)}
                style={{ width: 55, padding: '3px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }} />
              <span style={{ fontSize: 12, color: '#888' }}>%</span>
            </div>
            <span style={{ fontSize: 13, color: '#666' }}>{fmt(taxAmt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e8e6e0', fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>
            <span>Total</span><span style={{ color: '#2d9d78' }}>{fmt(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Payment terms, bank details, etc."
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 22px', background: saving ? '#aaa' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mark Paid Modal ────────────────────────────────────────────
function MarkPaidModal({ invoice, onClose, onSave }) {
  const [form, setForm] = useState({ payment_method: 'Bank Transfer', payment_reference: '', paid_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/invoices/${invoice.id}`, { status: 'paid', ...form });
      toast.success('Invoice marked as paid!');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to mark invoice as paid.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 420, padding: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Mark as Paid</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>{invoice.invoice_number} · ₹{Number(invoice.total_amount).toLocaleString('en-IN')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Payment Method</label>
            <select style={inputStyle} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              {['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'NEFT', 'RTGS', 'Other'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Reference / UTR Number</label>
            <input style={inputStyle} placeholder="e.g. UTR123456789" value={form.payment_reference} onChange={e => set('payment_reference', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Payment Date</label>
            <input type="date" style={inputStyle} value={form.paid_date} onChange={e => set('paid_date', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 22px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Confirm Payment'}
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
    const headers = [
      'Company Name',
      'GST Number',
      'Address',
      'City',
      'State',
      'Pincode',
      'Invoice Date',
      'Due Date',
      'Status',
      'Service/Product',
      'Description',
      'Quantity',
      'Unit Price',
      'GST %',
      'Notes',
    ];
    const sample1a = [
      'ABC Pvt Ltd', '07AATCM6426C1ZB', 'Shop No 24, DDA Shop Neeti Bagh', 'New Delhi', 'Delhi', '110049',
      '01/06/2026', '30/06/2026', 'draft',
      'Virtual CFO', 'Monthly CFO services for June 2026', 1, 15000, 18, '',
    ];
    // blank Company Name = 2nd item on the same invoice as sample1a
    const sample1b = [
      '', '', '', '', '', '', '', '', '',
      'Compliance Management', 'Annual compliance filing', 1, 5000, '', '',
    ];
    const sample2 = [
      'XYZ NGO', '', '', 'Mumbai', 'Maharashtra', '400001',
      '01/06/2026', '15/06/2026', 'sent',
      'Documentation', 'Record keeping services', 2, 3000, 18, 'Payment due by 15th',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample1a, sample1b, sample2]);
    ws['!cols'] = [20,18,30,14,14,10,14,14,10,20,36,10,12,8,28].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, 'invoice_bulk_upload_template.xlsx');
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

          if (jsonData.length === 0) {
            setUploading(false);
            return toast.error('The uploaded Excel file is empty');
          }

          // Group rows into invoices:
          // A row with a Company Name starts a new invoice.
          // A row with blank Company Name adds an item to the previous invoice.
          const grouped = [];
          let current = null;
          jsonData.forEach(row => {
            const company = (row['Company Name'] || row['Client Name'] || '').trim();
            if (company) {
              if (current) grouped.push(current);
              current = {
                company_name: company,
                gstin:        (row['GST Number'] || row['GSTIN'] || '').trim(),
                address:      (row['Address'] || '').trim(),
                city:         (row['City'] || '').trim(),
                state:        (row['State'] || '').trim(),
                pincode:      (row['Pincode'] || '').trim(),
                invoice_date: row['Invoice Date'] || '',
                due_date: row['Due Date'] || '',
                status: row['Status'] || 'draft',
                invoice_number: row['Invoice Number'] || '',
                tax_rate: Number(row['GST %'] || row['GST/Tax'] || row['Tax Rate'] || row['GST'] || 18),
                notes: row['Notes'] || '',
                items: [],
              };
            }
            if (current && (row['Description'] || row['Service/Product'] || row['Service'])) {
              current.items.push({
                service_name: row['Service/Product'] || row['Service'] || '',
                description: row['Description'] || '',
                quantity: Number(row['Quantity']) || 1,
                unit_price: Number(row['Unit Price']) || Number(row['Amount']) || 0,
              });
            }
          });
          if (current) grouped.push(current);
          const payload = grouped;

          const res = await api.post('/invoices/bulk', { invoices: payload }, { timeout: 120000 });
          setResults(res.data);
          if (res.data.successCount > 0) {
            toast.success(`${res.data.successCount} invoices generated successfully`);
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
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>Bulk Upload Invoices</h2>
        
        {!results ? (
          <>
            <div style={{ background: '#f8f7f4', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 12, color: '#555' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>Expected Excel Columns:</p>
                <button onClick={handleDownloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={12} /> Download Template
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, columns: 2 }}>
                <li>Company Name</li>
                <li>GST Number</li>
                <li>Address</li>
                <li>City</li>
                <li>State</li>
                <li>Pincode</li>
                <li>Invoice Date</li>
                <li>Due Date</li>
                <li>Status</li>
                <li>Service/Product</li>
                <li>Description</li>
                <li>Quantity</li>
                <li>Unit Price</li>
                <li>GST %</li>
                <li>Notes</li>
              </ul>
              <p style={{ margin: '8px 0 0', color: '#888', fontSize: 11 }}>
                💡 <b>Multiple items per invoice:</b> Fill Company Name only on the first row of an invoice. Leave it <b>blank</b> on the next rows to add more items to the same invoice.
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Select Excel File (.xlsx, .csv)</label>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} style={{ width: '100%', padding: '10px', border: '1px dashed #bbb', borderRadius: 8, cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !file} style={{ padding: '9px 22px', background: uploading || !file ? '#aaa' : '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading || !file ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploading ? 'Processing...' : <><Upload size={16} /> Upload & Generate</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: 16, background: '#e1f5ee', borderRadius: 8, textAlign: 'center', color: '#0f6e56' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{results.successCount}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Successful</div>
                </div>
                <div style={{ flex: 1, padding: 16, background: '#fcebeb', borderRadius: 8, textAlign: 'center', color: '#a32d2d' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{results.failedRecords?.length || 0}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Failed</div>
                </div>
              </div>

              {results.failedRecords?.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#333' }}>Failed Records Details</h4>
                  <div style={{ maxHeight: 200, overflowY: 'auto', background: '#f8f7f4', borderRadius: 8, padding: 12 }}>
                    {results.failedRecords.map((f, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < results.failedRecords.length - 1 ? '1px solid #ddd' : 'none', fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: '#a32d2d' }}>Invoice #{f.invoice}:</span> {f.error}
                        <div style={{ color: '#888', marginTop: 2, fontSize: 11 }}>
                          Client: {f.company || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Skeleton helper ────────────────────────────────────────────
function InvSkeleton({ w = '100%', h = 13, r = 6 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%', animation: 'inv-shimmer 1.4s infinite' }} />
  );
}

const INV_PAGE_SIZE = 50;

// ── Main Invoices Page ─────────────────────────────────────────
export default function Invoices() {
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [bulkModal, setBulkModal]     = useState(false);
  const [viewInvoice, setViewInvoice]  = useState(null);
  const [bulkPdfInvoices, setBulkPdfInvoices] = useState(null);
  const [paidModal, setPaidModal]      = useState(null);
  const [editModal, setEditModal]      = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (filterStatus === 'offboard') list = list.filter(inv => inv.clients?.is_offboard);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(inv =>
      (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.clients?.org_name || '').toLowerCase().includes(q) ||
      (inv.status || '').toLowerCase().includes(q)
    );
  }, [invoices, searchQuery, filterStatus]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(inv => inv.id));
    }
  };

  const toggleSelectInvoice = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} invoices?`)) return;
    try {
      await api.post('/invoices/delete-batch', { ids: selectedIds });
      toast.success('Invoices deleted successfully');
      setSelectedIds([]);
      fetchInvoices();
    } catch {
      toast.error('Failed to delete invoices');
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!window.confirm(`Are you sure you want to mark ${selectedIds.length} invoices as ${status}?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.patch(`/invoices/${id}`, { status })));
      toast.success(`Invoices marked as ${status}`);
      setSelectedIds([]);
      fetchInvoices();
    } catch {
      toast.error('Failed to update invoice statuses');
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  const handleBulkDownloadExcel = () => {
    if (filteredInvoices.length === 0) return toast.error('No invoices to download');
    const dataToExport = filteredInvoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Client Name': inv.clients?.org_name || '',
      'Issue Date': inv.issue_date,
      'Due Date': inv.due_date,
      'Status': inv.status,
      'Total Amount': inv.total_amount,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, 'invoices_export.xlsx');
  };

  const handleBulkDownloadPDF = async () => {
    const toPrint = selectedIds.length > 0 ? filteredInvoices.filter(i => selectedIds.includes(i.id)) : filteredInvoices;
    if (toPrint.length === 0) return toast.error('No invoices to print');
    toast.loading('Fetching full invoices...', { id: 'pdf' });
    try {
      const fullInvoices = await Promise.all(toPrint.map(inv => api.get(`/invoices/${inv.id}`).then(res => res.data)));
      setBulkPdfInvoices(fullInvoices);
      toast.success('Ready to print!', { id: 'pdf' });
    } catch {
      toast.error('Failed to load full invoices for PDF', { id: 'pdf' });
    }
  };

  const fetchInvoices = async (pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: filterStatus === 'offboard' ? '' : filterStatus,
        startDate, endDate,
        page: pg, limit: INV_PAGE_SIZE,
      };
      const { data } = await api.get('/invoices', { params });
      setInvoices(data.data || []);
      setTotal(data.total || 0);
      setSelectedIds([]);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load invoices');
    } finally { setLoading(false); }
  };

  const fetchInvoiceDetail = async (inv) => {
    try {
      const { data } = await api.get(`/invoices/${inv.id}`);
      setViewInvoice(data);
    } catch { toast.error('Could not load invoice details'); }
  };

  useEffect(() => { setPage(1); fetchInvoices(1); }, [filterStatus, startDate, endDate]);
  useEffect(() => { if (page > 1) fetchInvoices(page); }, [page]);


  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + +i.total_amount, 0);
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + +i.total_amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + +i.total_amount, 0);
  const totalDraft   = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + +i.total_amount, 0);
  const totalPages   = Math.ceil(total / INV_PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a18' }}>{isClient ? 'My Invoices' : 'Invoices'}</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{total.toLocaleString()} total · page {page} of {totalPages || 1}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isClient && selectedIds.length > 0 && (
            <>
              <button onClick={() => handleBulkStatusUpdate('draft')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#f8f7f4', color: '#666', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Edit2 size={14} /> Draft
              </button>
              <button onClick={() => handleBulkStatusUpdate('sent')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#eeedfe', color: '#534ab7', border: '1px solid #d4d1f9', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <ArrowRight size={14} /> Sent
              </button>
              <button onClick={() => handleBulkStatusUpdate('paid')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#eaf3de', color: '#3b6d11', border: '1px solid #cce8af', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <IndianRupee size={14} /> Paid
              </button>
              <button onClick={handleDeleteSelected} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#fcebeb', color: '#a32d2d', border: '1px solid #f5c6c6', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          {!isClient && (
            <>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={16} /> <span className="res-hide-xs">Bulk </span>Download
                </button>
                {showDownloadMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 5, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 200 }}>
                    <button onClick={() => { setShowDownloadMenu(false); handleBulkDownloadExcel(); }} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: '1px solid #eee', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#333' }}>
                      Excel (.xlsx)
                    </button>
                    <button onClick={() => { setShowDownloadMenu(false); handleBulkDownloadPDF(); }} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#333' }}>
                      PDF (All Invoices)
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setBulkModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Upload size={16} /> <span className="res-hide-xs">Bulk </span>Upload
              </button>
              <button onClick={() => setCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={16} /> Create
              </button>
            </>
          )}
        </div>
      </div>

      {/* Client info banner */}
      {isClient && (
        <div style={{ background: 'linear-gradient(135deg, #eeedfe 0%, #e6e4fd 100%)', border: '1px solid #d4d1f9', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <IndianRupee size={18} color="#534ab7" />
          <span style={{ fontSize: 13, color: '#534ab7', fontWeight: 500 }}>View your invoices and download PDF copies. For payment queries, raise a support ticket.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#fcebeb', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 18, color: '#a32d2d', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ⚠️ {error}
          <button onClick={() => fetchInvoices(page)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a32d2d', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="res-grid-4" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Collected',  val: totalPaid,    color: '#2d9d78', bg: '#e1f5ee', Icon: IndianRupee },
          { label: 'Pending',   val: totalPending,  color: '#534ab7', bg: '#eeedfe', Icon: FileText    },
          { label: 'Overdue',   val: totalOverdue,  color: '#e24b4a', bg: '#fcebeb', Icon: AlertCircle },
          { label: 'Draft',     val: totalDraft,    color: '#888',    bg: '#f8f7f4', Icon: Edit2       },
        ].map(({ label, val, color, bg, Icon }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#888', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color }}>{fmt(val)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Tabs & Filters */}
      <div style={{ marginBottom: 18 }}>
        <div className="res-tabs-scroll" style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          {[['', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['paid', 'Paid'], ['overdue', 'Overdue'], ['offboard', '⚠️ Offboard']].map(([s, label]) => {
            const isOffboardTab = s === 'offboard';
            const active = filterStatus === s;
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding: '7px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                  borderColor: active ? (isOffboardTab ? '#e67e22' : '#2d9d78') : isOffboardTab ? '#ffb74d' : '#ddd',
                  background: active ? (isOffboardTab ? '#fff3e0' : '#e1f5ee') : '#fff',
                  color: active ? (isOffboardTab ? '#e65100' : '#0f6e56') : isOffboardTab ? '#e67e22' : '#666'
                }}>{label}
              </button>
            );
          })}
        </div>
        
        {/* Search & Dates Row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
            <input
              type="text"
              placeholder="Search invoices by number or client..."
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>From:</span>
            <input type="date" style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid #ddd', fontSize: 12, flex: 1, minWidth: 130 }} 
                value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>To:</span>
            <input type="date" style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid #ddd', fontSize: 12, width: 130 }} 
                value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="res-table-container" style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e8e6e0' }}>
              {!isClient && <th style={{ padding: '11px 14px', textAlign: 'left' }}><input type="checkbox" checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0} onChange={toggleSelectAll} /></th>}
              {['Invoice #', ...(isClient ? [] : ['Client']), 'Issue Date', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  {!isClient && <td style={{ padding: '14px' }}><InvSkeleton w={16} h={16} r={4} /></td>}
                  <td style={{ padding: '14px' }}><InvSkeleton w="80%" h={13} /></td>
                  {!isClient && <td style={{ padding: '14px' }}><InvSkeleton w="70%" h={13} /></td>}
                  <td style={{ padding: '14px' }}><InvSkeleton w="60%" h={12} /></td>
                  <td style={{ padding: '14px' }}><InvSkeleton w="60%" h={12} /></td>
                  <td style={{ padding: '14px' }}><InvSkeleton w="55%" h={14} /></td>
                  <td style={{ padding: '14px' }}><InvSkeleton w={65} h={22} r={11} /></td>
                  <td style={{ padding: '14px' }}><InvSkeleton w={100} h={28} r={7} /></td>
                </tr>
              ))
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan={isClient ? 7 : 8} style={{ textAlign: 'center', padding: 50, color: '#aaa' }}>
                <FileText size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                No invoices found
              </td></tr>
            ) : filteredInvoices.map(inv => {
              const s = STATUS_STYLE[inv.status] || STATUS_STYLE.draft;
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  {!isClient && <td style={{ padding: '12px 14px' }}><input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleSelectInvoice(inv.id)} /></td>}
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#185fa5' }}>{inv.invoice_number}</td>
                  {!isClient && (
                    <td style={{ padding: '12px 14px', color: '#333', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {inv.clients?.org_name || '—'}
                        {inv.clients?.is_offboard && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#fff3e0', color: '#e65100', fontWeight: 600, whiteSpace: 'nowrap' }}>Offboard</span>
                        )}
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '12px 14px', color: '#666', fontSize: 12 }}>
                    {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: inv.status === 'overdue' ? '#e24b4a' : '#666', fontSize: 12 }}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1a1a18' }}>{fmt(inv.total_amount)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600, textTransform: 'capitalize' }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* View & Print — always visible */}
                      <button onClick={() => fetchInvoiceDetail(inv)}
                        title="View & Print"
                        style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555' }}>
                        <Eye size={12} /> View
                      </button>
                      {/* Admin-only actions */}
                      {!isClient && (
                        <>
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <button onClick={() => setPaidModal(inv)}
                              title="Mark as Paid"
                              style={{ padding: '5px 10px', border: '1px solid #2d9d78', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11, color: '#2d9d78', fontWeight: 600 }}>
                              Mark Paid
                            </button>
                          )}
                          {inv.status === 'draft' && (
                            <button onClick={async () => {
                              await api.patch(`/invoices/${inv.id}`, { status: 'sent' });
                              toast.success('Invoice marked as sent!');
                              fetchInvoices();
                            }}
                              style={{ padding: '5px 10px', border: '1px solid #534ab7', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11, color: '#534ab7', fontWeight: 600 }}>
                              Mark Sent
                            </button>
                          )}
                          <button onClick={() => setEditModal(inv)}
                            title="Edit"
                            style={{ padding: '5px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#555' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteInvoice(inv.id)}
                            title="Delete"
                            style={{ padding: '5px', border: '1px solid #f5c6c6', borderRadius: 6, background: '#fcebeb', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#a32d2d' }}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px', marginTop: 10 }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            Showing {((page-1)*INV_PAGE_SIZE)+1}–{Math.min(page*INV_PAGE_SIZE,total)} of {total.toLocaleString()} invoices
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ padding: '7px 14px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===1?'not-allowed':'pointer', opacity: page===1?0.4:1 }}>
              ← Prev
            </button>
            <span style={{ padding: '7px 14px', background: '#1a1a18', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding: '7px 14px', border: '1px solid #e8e5e0', borderRadius: 8, background: '#fff', cursor: page===totalPages?'not-allowed':'pointer', opacity: page===totalPages?0.4:1 }}>
              Next →
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes inv-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Modals */}
      {!isClient && createModal && <CreateInvoiceModal onClose={() => setCreateModal(false)} onSave={fetchInvoices} />}
      {!isClient && bulkModal && <BulkUploadModal onClose={() => setBulkModal(false)} onSave={fetchInvoices} />}
      {viewInvoice  && <InvoicePrintView invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
      {!isClient && bulkPdfInvoices && <BulkPDFGenerator invoices={bulkPdfInvoices} onClose={() => setBulkPdfInvoices(null)} />}
      {!isClient && paidModal    && <MarkPaidModal invoice={paidModal} onClose={() => setPaidModal(null)} onSave={fetchInvoices} />}
      {!isClient && editModal    && <EditInvoiceModal invoice={editModal} onClose={() => setEditModal(null)} onSave={fetchInvoices} />}
    </div>
  );
}
