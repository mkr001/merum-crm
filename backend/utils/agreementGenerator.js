// utils/agreementGenerator.js
const fs = require('fs');
const path = require('path');

function getShortName(companyName) {
  if (!companyName) return 'CLIENT';
  const clean = companyName.replace(/private|limited|pvt|ltd|section 8|society|trust/gi, '').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return words.map(w => w[0].toUpperCase()).join('') + 'L';
  }
  return clean.substring(0, 8).toUpperCase();
}

function generateAgreementHTML(record) {
  const overrides = record.agreement_overrides || {};

  const logoPath = "/logo.png";

const logoImg = `
  <img 
    src="${logoPath}" 
    alt="Merum"
    style="height:70px;width:auto;object-fit:contain;" 
  /> `;
//   const logoImg = logoDataUri
//     ? `<img src="${logoDataUri}" alt="Merum" style="height:52px;width:auto;object-fit:contain;" />`
//     : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 19H22L12 2Z" fill="#C70073"/></svg>`;

  const companyName = record.company_name || 'Prospect Client Name';
  const shortName = getShortName(companyName);
  const address = record.registered_address || 'Registered Address Not Specified';
  const entityType = record.entity_type || 'NGO';

  // --- Overrideable fields ---
  const authDateRaw = overrides.effective_date || record.auth_date || new Date().toISOString();
  const dateFormatted = new Date(authDateRaw).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const masterAgreementRef  = overrides.master_agreement_ref  || 'Transforming Rural India Foundation';
  const masterAgreementDate = overrides.master_agreement_date || '01st February 2026';

  const signatory       = overrides.client_signatory_name  || record.authorized_signatory || 'Authorized Signatory';
  const signatureName   = overrides.client_signature_name  || record.signature_name       || 'Typed Signature';
  const designationAuth = overrides.client_signatory_title || record.designation_auth     || 'Director';

  const merumSignatoryName  = overrides.merum_signatory_name  || 'Arvind Tripathi';
  const merumSignatoryTitle = overrides.merum_signatory_title || 'Director';

  const monthlyFee = overrides.monthly_fee || '15,000';
  const feeText    = overrides.fee_text    || `Monthly Fee of INR ${monthlyFee}/- plus applicable GST.`;

  // --- Service Levels (overrideable table) ---
  const defaultServiceLevels = [
    { component: 'Monthly financial reports',      target: 'Delivered by the 8th working day of each month' },
    { component: 'Turnaround time for accounting', target: 'Within 2 business days' },
    { component: 'Finalized year end Accounts',    target: 'Within 60 days of Financial Year end' },
    { component: 'Query Response Time',            target: 'Within 1 business day' },
    { component: 'Statutory Compliances',          target: 'Before the time limits prescribed by corresponding Laws' },
  ];
  const serviceLevels = (overrides.service_levels && overrides.service_levels.length > 0)
    ? overrides.service_levels
    : defaultServiceLevels;

  // --- Client Responsibilities (overrideable list) ---
  const defaultResponsibilities = [
    'Provide daily transaction updates through the pre-designed sheet before the 2nd business day of the following month.',
    'Notify changes in Directors, key personnel or regulatory status within 7 days.',
    'Notify of general/board meetings at least 7 days in advance.',
    'Provide joining/resignation updates for payroll staff within 7 days.',
    'Furnish all physical/digital copy supporting documents for accounting and validation.',
    'Approve deliverables within 5 working days of submission.',
  ];
  const responsibilities = (overrides.client_responsibilities && overrides.client_responsibilities.length > 0)
    ? overrides.client_responsibilities
    : defaultResponsibilities;

  // --- Custom Clauses (additional clauses beyond 11) ---
  const customClauses = overrides.custom_clauses || [];

  // --- Services SOW ---
  const servicesList = record.required_services || [];
  const hasBookkeeping = servicesList.some(s => s.toLowerCase().includes('bookkeeping') || s.toLowerCase().includes('accounting'));
  const hasTds = servicesList.some(s => s.toLowerCase().includes('tds'));
  const hasGst = servicesList.some(s => s.toLowerCase().includes('gst'));

  let sowHtml = '';
  if (hasBookkeeping) {
    sowHtml += `
      <div class="sow-section">
        <h3>Book Keeping, Accounting Support</h3>
        <ul>
          <li>Bookkeeping support and review bookkeeping as per defined chart of accounts.</li>
          <li>Set up and provide access to a remote resolution desk to resolve technical issues in accounting and statutory compliance matters.</li>
          <li>Free access to cloud-based accounting software.</li>
        </ul>
      </div>`;
  }
  if (hasGst || hasTds) {
    sowHtml += `<div class="sow-section"><h3>Statutory Compliances Support</h3><ul>`;
    if (hasGst) {
      sowHtml += `
        <li><strong>GST Returns:</strong>
          <ul>
            <li>Monthly/Quarterly GSTR-1 &amp; GSTR-3B filings.</li>
            <li>GST Annual Return (Form 9) preparation and filing.</li>
          </ul>
        </li>`;
    }
    if (hasTds) {
      sowHtml += `
        <li><strong>INCOME TAX / TDS:</strong>
          <ul>
            <li>Quarterly TDS Return Filing and Form 16A issuance.</li>
            <li>Support for Tax Audit where applicable and Annual Income Tax Return.</li>
          </ul>
        </li>`;
    }
    sowHtml += `</ul></div>`;
  }
  const otherServices = servicesList.filter(s =>
    !s.toLowerCase().includes('bookkeeping') &&
    !s.toLowerCase().includes('accounting') &&
    !s.toLowerCase().includes('gst') &&
    !s.toLowerCase().includes('tds')
  );
  if (otherServices.length > 0) {
    sowHtml += `
      <div class="sow-section">
        <h3>Other Services Included</h3>
        <ul>
          ${otherServices.map(s => `<li><strong>${s}</strong>: General support and regulatory filings.</li>`).join('')}
        </ul>
      </div>`;
  }

  // --- Custom Clauses HTML ---
  const customClausesHtml = customClauses.map(c => `
    <p class="clause"><span class="bold">${c.number} ${c.title}:</span> ${c.text}</p>
  `).join('');

  // =====================================================================
  // HTML OUTPUT
  // =====================================================================
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Service Agreement - ${companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@1,600&display=swap');

    body {
      font-family: 'Inter', sans-serif;
      color: #333330;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f5f5f3;
    }
    .page {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 20px auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      box-sizing: border-box;
      position: relative;
    }
    .agreement-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #C70073;
      padding-bottom: 12px;
      margin-bottom: 30px;
    }
    .logo-container { display: flex; align-items: center; gap: 6px; }
    .logo-container img { height: 52px; width: auto; }
    .logo-text h1 { margin: 0; font-size: 20px; font-weight: 800; color: #111110; letter-spacing: 0.5px; }
    .logo-text p  { margin: 0; font-size: 11px; color: #666; font-weight: 500; }
    .doc-title-badge { font-size: 13px; font-weight: 700; color: #C70073; text-transform: uppercase; letter-spacing: 1px; }
    .agreement-footer {
      position: absolute; bottom: 15mm; left: 20mm; right: 20mm;
      display: flex; justify-content: space-between;
      border-top: 1px solid #e8e6e0; padding-top: 8px;
      font-size: 9px; color: #888;
    }
    .agreement-footer a { color: #C70073; text-decoration: none; }
    h2.main-title {
      font-size: 22px; font-weight: 700; text-align: center;
      margin: 40px 0 30px; color: #111110;
      text-transform: uppercase; letter-spacing: 1px;
    }
    p.clause, li { font-size: 13.5px; text-align: justify; margin-bottom: 14px; }
    .bold { font-weight: 700; }
    .signature-block {
      margin-top: 50px;
      display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
      page-break-inside: avoid;
    }
    .sig-col {
      border: 1px solid #e8e6e0; border-radius: 8px;
      padding: 16px; background: #fafafa;
    }
    .sig-col h4 {
      margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 6px;
      color: #C70073; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .sig-line {
      margin-top: 25px; border-bottom: 1px dotted #999; height: 35px;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px; font-style: italic; color: #1e3a8a; padding-left: 10px;
    }
    .sig-details { margin-top: 8px; font-size: 12px; color: #555; line-height: 1.5; }
    .page-break { page-break-before: always; }
    .sow-section h3 { font-size: 13px; font-weight: 700; margin: 12px 0 6px; color: #333; }
    table.fee-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    table.fee-table th, table.fee-table td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
    table.fee-table th { background: #f5f5f3; font-weight: 700; }
    .no-print-bar {
      background: #111110; padding: 12px 24px;
      display: flex; justify-content: space-between; align-items: center;
      position: sticky; top: 0; z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .no-print-bar span { color: #fff; font-size: 14px; font-weight: 600; }
    .print-btn {
      background: #C70073; color: #fff; border: none;
      padding: 8px 18px; border-radius: 6px; font-size: 13px;
      font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s;
    }
    .print-btn:hover { background: #a3005d; }
    @media print {
      body { background-color: #fff; }
      .no-print-bar { display: none !important; }
      .page {
        margin: 0 !important; box-shadow: none !important;
        width: 100% !important; height: auto !important;
        page-break-after: always;
      }
      .page:last-child { page-break-after: avoid; }
    }
  </style>
</head>
<body>

  <!-- Sticky Print Bar -->
  <div class="no-print-bar">
    <span>📄 Service Agreement — ${companyName}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <!-- PAGE 1 -->
  <div class="page">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
      <div class="doc-title-badge">Service Agreement</div>
    </div>

    <h2 class="main-title">Service Agreement</h2>

    <p class="clause">This is with reference to the Master Service Agreement signed between <span class="bold">${masterAgreementRef}</span> and Merum Shared Services Private Limited dated <span class="bold">${masterAgreementDate}</span>.</p>

    <p class="clause">This Services Agreement is made on <span class="bold">${dateFormatted}</span> ("Effective date - ${dateFormatted}") by and between:</p>

    <p class="clause"><span class="bold">1. MERUM SHARED SERVICES PRIVATE LIMITED</span>, a company established under the Indian Companies Act, 2013 (Registration no. U70200DL2025PTC452136 with its registered office at SHOP No 24 GROUND FLOOR, DDA SHOP NEETI BAGH, New Delhi South Ext-II, New Delhi, South Delhi- 110049, Delhi ("MSSPL"); and</p>

    <p class="clause"><span class="bold">2. ${companyName}</span>, a company established under the rules of ${entityType} and having its principal place of business at ${address} ("${shortName}").</p>

    <p class="clause">WHEREAS MSSPL provides various kinds of specialized professional and consulting services in the areas of farmers collectives, Community-based organizations, Merum Shares, Financial literacy, book keeping, financial advisory, statutory compliances, training on various functional areas of developmental and rural enterprises etc.</p>

    <p class="clause">WHEREAS ${shortName} seeks to utilize certain professional services from MSSPL on a principal-to-principal basis; and</p>

    <p class="clause">WHEREAS MSSPL and ${shortName} have now agreed to record the terms of their agreement in writing in the form of this binding Agreement.</p>

    <p class="clause"><span class="bold">The parties agree:</span></p>
    <p class="clause"><span class="bold">1 Definition:</span> In this Agreement, the following terms have the meanings indicated:</p>
    <p class="clause">"Agreement" means these terms and conditions, including the Statement(s) of Work ("SOW"), which includes the Scope of Services, Fees, and any special terms, as supplemented or varied by any engagement letter setting out the Service.</p>
    <p class="clause">"Fees" means the fees payable by ${shortName} to MSSPL as outlined in Schedule A and the applicable SoW.</p>
    <p class="clause">"Services" means such professional and consulting services as described in a SOW and may include services such as administrative processing, processing and reporting.</p>
    <p class="clause">"SoW" means such document, signed by both parties, which authorizes the performance of the services described herein, in a form substantially similar to the sample SoW included as Schedule B.</p>

    <div class="agreement-footer">
      <span>Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh, South Delhi-110049</span>
      <span>CIN: U70200DL2025PTC452136 | <a href="mailto:support@merums.com">support@merums.com</a></span>
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
      <div class="doc-title-badge">Service Agreement</div>
    </div>

    <p class="clause"><span class="bold">2 Provision of Services:</span> MSSPL will provide the Services to ${shortName} in accordance with and subject to the terms of this Agreement and the applicable SoW. MSSPL shall provide the Services with reasonable care and skill to a standard expected of a professional provider of such services. MSSPL will take instructions from and report to the person(s) Specified in the applicable SoW. If any instructions represent additional or new services not covered within the scope of the relevant SOW then the parties will execute a change order. MSSPL will establish, implement and maintain an adequate contingency plan for disaster recovery including periodic testing of backup facilities.</p>

    <p class="clause"><span class="bold">3 Fees:</span> ${shortName} shall pay the Fees specified in the applicable SoW, in consideration of MSSPL providing the Services. The parties specifically agree that settlement of MSSPL invoices is not contingent on the receipt of any payment by ${shortName} from a donor or other third party. In case of documented delay in donor or client disbursement beyond ${shortName}'s control, the parties shall mutually agree a revised payment schedule in good faith.</p>

    <p class="clause"><span class="bold">4 Provision of Information and Assistance:</span> ${shortName} will provide all reasonable and necessary timely cooperation to enable MSSPL to provide the services, including any responsibilities described in the SOW. ${shortName} acknowledges that MSSPL's ability to provide the services is dependent on MSSPL having access to complete, accurate, up-to-date and timely documentation and information.</p>

    <p class="clause"><span class="bold">5 Confidentiality and Data Protection:</span> Each party to this Agreement is likely from time to time to disclose information to the other party in the course of the provision of the services. The Receiving Party will not divulge or communicate such information to any person, other than a person who needs to have the information to enable the Services to be provided. MSSPL shall implement industry-standard data security measures and shall notify ${shortName} within two (2) working days of any data breach or suspected breach. MSSPL shall not use ${shortName}'s data for benchmarking, analytics, AI training, or derivative commercial purposes without prior written consent.</p>

    <p class="clause"><span class="bold">6 Intellectual Property:</span> Each party acknowledges that the other party and its affiliates, third party service providers and subcontractors will retain all copyright and other intellectual property rights in the methodologies, methods of analysis, ideas, concepts, know-how, models, tools, techniques, skills, knowledge and experience possessed before carrying out any of the Services, or as acquired during the performance of this Agreement.</p>

    <div class="agreement-footer">
      <span>Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh, South Delhi-110049</span>
      <span>CIN: U70200DL2025PTC452136 | <a href="mailto:support@merums.com">support@merums.com</a></span>
    </div>
  </div>

  <!-- PAGE 3 -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
      <div class="doc-title-badge">Service Agreement</div>
    </div>

    <p class="clause"><span class="bold">7 Liability for Losses:</span> The aggregate liability of MSSPL in relation to this Agreement and the SOWs, whether in contract, tort or otherwise, shall not exceed the total amounts received by MSSPL during the last twelve (12) months of the date of the last claim under the Agreement. In no event shall either party be liable for any indirect, consequential or punitive loss, damage, cost or expense. ${shortName} agrees to indemnify, defend and hold harmless MSSPL for all loss suffered or incurred as a result of any proceedings or investigation that may be initiated against MSSPL with respect to ${shortName}'s financial reporting or bookkeeping requirements, except where arising due to MSSPL's negligence or error.</p>

    <p class="clause"><span class="bold">8 Unforeseen Events:</span> Neither party can predict delays resulting from events beyond their reasonable control (acts of God, fire, flood, riots, government closures, etc.). Should such circumstances arise, and continue for sixty (60) days, MSSPL will use reasonable endeavors to continue services. Either party may terminate this Agreement by giving sixty (60) days written notice.</p>

    <p class="clause"><span class="bold">9 Duration and Termination of this Agreement:</span> The initial term of this Agreement shall be one year from the Effective Date, with annual automatic renewal unless either party provides notice of its intent not to renew at least sixty (60) days prior to the expiration date. In the event of a material breach, the other party may terminate the Agreement vide written notice after giving not less than sixty (60) days to remedy such breach.</p>

    <p class="clause"><span class="bold">10 Notices:</span> Any notice which is to be given by one party to the other under this Agreement will be given in writing. It will be effective if delivered to the address set out in this Agreement.</p>

    <p class="clause"><span class="bold">11 Other Provisions:</span> MSSPL may utilize subcontractors and will be responsible for their acts as if they were MSSPL's own. MSSPL shall ensure that any subcontractor handling client data signs confidentiality undertakings equivalent to this Agreement. This Agreement shall be governed by and construed in accordance with the laws of India, with seat of arbitration in New Delhi.</p>

    ${customClausesHtml}

    <div class="signature-block">
      <div class="sig-col">
        <h4>For Merum Shared Services Pvt Ltd</h4>
        <div class="sig-line" style="font-size:16px;font-weight:bold;color:#534ab7;">${merumSignatoryName}</div>
        <div class="sig-details">
          <strong>By:</strong> ${merumSignatoryName}<br>
          <strong>Title:</strong> ${merumSignatoryTitle}<br>
          <strong>Date:</strong> ${dateFormatted}
        </div>
      </div>
      <div class="sig-col">
        <h4>For ${companyName}</h4>
        <div class="sig-line">${signatureName}</div>
        <div class="sig-details">
          <strong>By:</strong> ${signatory}<br>
          <strong>Title:</strong> ${designationAuth}<br>
          <strong>Date:</strong> ${dateFormatted}
        </div>
      </div>
    </div>

    <div class="agreement-footer">
      <span>Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh, South Delhi-110049</span>
      <span>CIN: U70200DL2025PTC452136 | <a href="mailto:support@merums.com">support@merums.com</a></span>
    </div>
  </div>

  <!-- PAGE 4 — Schedules -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
      <div class="doc-title-badge">Schedules</div>
    </div>

    <h2 style="font-size:16px;color:#C70073;text-transform:uppercase;margin-top:20px;border-bottom:1px solid #ddd;padding-bottom:5px;">Schedule A - Fees</h2>
    <p class="clause">1. The Fees payable in respect of the Services will be set forth in the applicable Statement of Work (SoW).</p>
    <p class="clause">2. Fees are exclusive of all taxes, other than income tax. Applicable GST will be added to the invoices.</p>
    <p class="clause">3. ${shortName} agrees to pay each invoice within 30 days of the date of the invoice.</p>
    <p class="clause"><strong>Agreed Commercials:</strong> ${feeText}</p>

    <h2 style="font-size:16px;color:#C70073;text-transform:uppercase;margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:5px;">Schedule B - Statement of Work (SoW)</h2>
    <p class="clause" style="margin-bottom:20px;">This Statement of Work (SoW) is executed pursuant to the Services Agreement between MERUM SHARED SERVICES PRIVATE LIMITED (MSSPL) and ${companyName}.</p>

    <h4 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;">Scope of Services Selected:</h4>
    ${sowHtml || '<p style="color:#888;font-size:13px;">No specific services selected — see engagement letter.</p>'}

    <div class="agreement-footer">
      <span>Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh, South Delhi-110049</span>
      <span>CIN: U70200DL2025PTC452136 | <a href="mailto:support@merums.com">support@merums.com</a></span>
    </div>
  </div>

  <!-- PAGE 5 — Service Levels & Responsibilities -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
      <div class="doc-title-badge">Schedules Continued</div>
    </div>

    <h4 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:5px;">Service Levels:</h4>
    <table class="fee-table">
      <thead>
        <tr>
          <th>Service Component</th>
          <th>Service Level Target</th>
        </tr>
      </thead>
      <tbody>
        ${serviceLevels.map(sl => `
          <tr>
            <td>${sl.component}</td>
            <td>${sl.target}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h4 style="margin:20px 0 10px;font-size:14px;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:5px;">Client Responsibilities:</h4>
    <ol style="font-size:12px;padding-left:20px;line-height:1.5;">
      ${responsibilities.map(r => `<li>${r}</li>`).join('')}
    </ol>

    <div class="agreement-footer">
      <span>Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh, South Delhi-110049</span>
      <span>CIN: U70200DL2025PTC452136 | <a href="mailto:support@merums.com">support@merums.com</a></span>
    </div>
  </div>

</body>
</html>
  `;
}

module.exports = { generateAgreementHTML };
