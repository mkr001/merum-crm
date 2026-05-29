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
    { component: 'Finalized year end Accounts',    target: 'Within 60 days' },
    { component: 'Any special Report',             target: 'Within 5 Working days' },
    { component: 'Query Response Time',            target: 'Within 1 business day' },
    { component: 'Data accuracy',                  target: '100%' },
    { component: 'System uptime (if using shared platform)', target: '99% monthly' },
    { component: 'Issue resolution',              target: 'Case to case, agreed between parties' },
    { component: 'Statutory Compliances',          target: 'Before the time limit prescribed by the different Laws' },
    {
      component: `Closure File at the end of the Financial Year<br>
                  <ul style="list-style-type:none; padding-left:15px; margin:5px 0; font-size:11px; line-height:1.4;">
                    <li>- Opening and Closing \${shortName} Balance</li>
                    <li>- Income & Expenditure, Balance sheet</li>
                    <li>- Cash Flow and related schedules</li>
                    <li>- Copy of all related challans and returns</li>
                    <li>- Full accounting data backup - Pen drive</li>
                    <li>- Voucher Files, Agreements etc.</li>
                  </ul>`,
      target: 'Within 90 days of Financial Year end'
    }
  ];
  const serviceLevels = (overrides.service_levels && overrides.service_levels.length > 0)
    ? overrides.service_levels
    : defaultServiceLevels;

  // --- Client Responsibilities (overrideable list) ---
  const defaultResponsibilities = [
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

  let sowHtml = overrides.sow_html || '';
  if (!sowHtml) {
    if (hasBookkeeping) {
      sowHtml += `
<p style="font-size:12px; font-weight: 700; text-decoration: underline; margin:15px 0 5px;">Book Keeping, Accounting Support</p>
<ul style="font-size:12px; margin:0 0 10px; padding-left:20px;">
  <li>Bookkeeping/ support and review bookkeeping as per defined chart of accounts</li>
  <li>Set up and Provide access to a remote resolution desk to resolve technical issues in accounting and statutory compliance matters for Producer Companies</li>
  <li>Free access to cloud-based accounting software</li>
</ul>`;
    }
    if (hasGst || hasTds) {
      sowHtml += `<p style="font-size:12px; font-weight: 700; text-decoration: underline; margin:15px 0 5px;">Statutory Compliances support</p><ul style="font-size:12px; margin:0 0 10px; padding-left:20px;">`;
      if (hasGst) {
        sowHtml += `
  <li><strong>GST</strong>
    <ul style="list-style-type:none; padding-left:15px; margin: 5px 0;">
      <li>- GSTR-1</li>
      <li>- GSTR-3B</li>
      <li>- GST Annual Return-9</li>
    </ul>
  </li>`;
      }
      if (hasTds) {
        sowHtml += `
  <li><strong>INCOME TAX</strong>
    <ul style="list-style-type:none; padding-left:15px; margin: 5px 0;">
      <li>- Quarter TDS Return Filing</li>
      <li>- Quarter Form 16A Issue</li>
      <li>- Support Tax Audit where applicable</li>
      <li>- Income Annual Tax Return</li>
    </ul>
  </li>`;
      }
      // Always add COMPANY LAW and Other laws
      sowHtml += `
  <li><strong>COMPANY LAW</strong>
    <ul style="list-style-type:none; padding-left:15px; margin: 5px 0;">
      <li>- Roc Annual Return Form MGT-7</li>
      <li>- ADT - 1: Auditor Appointment</li>
      <li>- KYC of the Company Director(s)</li>
      <li>- DIR-12: Intimation for the Changing of Board Members</li>
      <li>- ROC Annual Financial Statement Form AOC-4</li>
      <li>- Board Meetings & AGM minutes</li>
      <li>- Share Holders and Board Members updates</li>
      <li>- Pass-3 Filing</li>
    </ul>
  </li>
  <li>Other laws compliance like PF, ESIC</li>
</ul>`;
    }
    
    sowHtml += `
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
</ul>`;
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
      justify-content: flex-start;
      align-items: center;
      margin-bottom: 30px;
    }
    .logo-container { display: flex; align-items: center; gap: 6px; }
    .logo-container img { height: 60px; width: auto; }
    .logo-text h1 { margin: 0; font-size: 20px; font-weight: 800; color: #111110; letter-spacing: 0.5px; }
    .logo-text p  { margin: 0; font-size: 11px; color: #666; font-weight: 500; }
    .agreement-footer {
      position: absolute; bottom: 0; left: 0; right: 0;
      display: flex; justify-content: space-between;
      background-color: #315cb5; padding: 15px 20mm;
      font-size: 10px; color: #fff;
    }
    .agreement-footer a { color: #fff; text-decoration: underline; }
    .footer-left { max-width: 60%; }
    .footer-right { text-align: right; }
    h2.main-title {
      font-size: 16px; font-weight: 700; text-align: center;
      margin: 40px 0 30px; color: #111110;
    }
    p.clause, li { font-size: 12px; text-align: justify; margin-bottom: 14px; }
    .bold { font-weight: 700; }
    .signature-block {
      margin-top: 50px;
      display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
      page-break-inside: avoid;
    }
    .sig-col {
      padding: 16px;
    }
    .sig-col h4 {
      margin-top: 0; padding-bottom: 6px;
      color: #333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .sig-line {
      margin-top: 25px; height: 35px;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px; font-style: italic; color: #1e3a8a;
    }
    .sig-details { margin-top: 8px; font-size: 12px; color: #333; line-height: 1.5; }
    .page-break { page-break-before: always; }
    .sow-section h3 { font-size: 13px; font-weight: 700; margin: 12px 0 6px; color: #333; text-decoration: underline; }
    table.fee-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    table.fee-table th, table.fee-table td { border: none; padding: 6px 12px; text-align: left; }
    table.fee-table th { font-weight: 700; }
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
        padding-bottom: 40mm; /* Extra padding for footer */
      }
      .page:last-child { page-break-after: avoid; }
      .agreement-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 20mm; }
    }
  </style>
</head>
<body>

  <!-- PAGE 1 -->
  <div class="page">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <h2 class="main-title">Service Agreement</h2>

    <p class="clause">This is with reference to the Master Service Agreement signed between <span class="bold">${masterAgreementRef}</span> and Merum Shared Services Private Limited dated <span class="bold">${masterAgreementDate}</span>.</p>

    <p class="clause">This Services Agreement is made on <span class="bold">${dateFormatted}</span> ("Effective date - ${dateFormatted}") by and between:</p>

    <p class="clause"><span class="bold">1. MERUM SHARED SERVICES PRIVATE LIMITED</span>, a company established under the Indian Companies Act, 2013 (Registration no. U70200DL2025PTC452136 with its registered office at SHOP No 24 GROUND FLOOR, DDA SHOP NEETI BAGH, New Delhi South Ext-II, New Delhi, South Delhi- 110049, Delhi ("MSSPL"); and</p>

    <p class="clause"><span class="bold">2. ${companyName}</span>, a company established under the rules of ${entityType} and having its principal place of business at ${address} ("${shortName}").</p>

    <p class="clause">WHEREAS MSSPL provides various kinds of specialized professional and consulting services in the areas of farmers collectives, Community-based organizations, Merum Shares, Financial literacy, book keeping, financial advisory, statutory compliances, training on various functional areas of developmental and rural enterprises etc.</p>

    <p class="clause">WHEREAS ${shortName} seeks to utilize certain professional services from MSSPL on a principal-to-principal basis; and</p>

    <p class="clause">WHEREAS MSSPL and ${shortName} have now agreed to record the terms of their agreement in writing in the form of this binding Agreement.</p>

    <p class="clause"><span class="bold">The parties agree:</span><br>
    <span class="bold">1 Definition:</span> In this Agreement, the following terms have the meanings indicated:</p>
    <p class="clause">"Agreement" means these terms and conditions, including the Statement(s) of Work ("SOW"), which includes the Scope of Services, Fees, and any special terms, as supplemented or varied by any engagement letter setting out the Service.</p>
    <p class="clause">"Fees" means the fees payable by ${shortName} to MSSPL as outlined in Schedule A and the applicable SoW.</p>
    <p class="clause">"Services" means such professional and consulting services as described in a SOW and may include services such as administrative processing, processing and reporting.</p>
    <p class="clause">"SoW" means such document, signed by both parties, which authorizes the performance of the services described herein, in a form substantially similar to the sample SoW included as Schedule B. The SoW will mention the detailed scope of Services to be performed and the Fees to be paid for the same.</p>

    <p class="clause"><span class="bold">2 Provision of Services:</span> MSSPL will provide the Services to ${shortName} in accordance with and subject to the terms of this Agreement and the applicable SoW. MSSPL shall provide the Services with reasonable care and skill to a standard expected of a professional provider of such services. MSSPL will take instructions from and report to the person(s) Specified in the applicable SoW (or any successor) or any persons) nominated by such person(s) from time to time. If any of these instructions from the nominated representative of ${shortName} represents additional or new services that are not covered within the scope of the relevant SOW then the parties will execute a change order for documenting the scope and payment terms of such services. Upon execution of such change order the parties will initiate the execution of such instructions. MSSPL will establish, implement and maintain an adequate contingency plan for disaster recovery including periodic testing of backup facilities to the extent necessary to ensure continued provision of the services to ${shortName}. MSSPL shall ensure that all statutory filings and compliance-related services are performed by qualified professionals and in compliance with applicable Indian laws.</p>

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <p class="clause"><span class="bold">3 Fees:</span> ${shortName} shall pay the Fees specified in the applicable SoW, in consideration of MSSPL providing the Services to ${shortName} in accordance with this Agreement. The parties specifically agree that settlement of MSSPL invoices is not contingent on the receipt of any payment by ${shortName} from a donor or other third party. In case of documented delay in donor or client disbursement beyond ${shortName}'s control, the parties shall mutually agree a revised payment schedule in good faith.</p>

    <p class="clause"><span class="bold">4 Provision of Information and Assistance:</span> ${shortName} will provide all reasonable and necessary timely cooperation to enable MSSPL to provide the services, including any responsibilities described in the SOW. ${shortName} acknowledges that MSSPL's ability to provide the services is dependent on MSSPL having access to and being able to spend time with certain employees of ${shortName} and other individuals (including third parties such as ${shortName}'s associates and other advisors) and also on MSSPL being provided with and continuing to receive complete, accurate, up-to-date and timely documentation and information by ${shortName} including without limitation, financial records and information. ${shortName} agrees that if any documentation or information supplied to MSSPL at any time is incomplete, inaccurate or not up-to-date, or provision is unreasonably delayed, or if adequate access as described in the previous paragraph is not provided, then MSSPL will not be responsible for any delays or failure to deliver services arising as a result therefrom.</p>

    <p class="clause"><span class="bold">5 Confidentiality and Data Protection:</span> Each party to this Agreement is likely from time to time to disclose information to the other party in the course of the provision of the services. The party receiving the information ("the Receiving Party") will not divulge or communicate such information to any person, other than a person who is an employee of the Receiving Party and who needs to have the information to enable the Services to be provided. This restriction does not apply to information which the receiving party must by law disclose, or to information which is either already in the public domain or enters the public domain through no fault of the receiving party or is disclosed with prior written consent of the disclosing party. MSSPL shall implement industry-standard data security measures and shall notify ${shortName} within two (2) working days of any data breach or suspected breach affecting ${shortName} data.</p>
    
    <p class="clause">${shortName} agrees that MSSPL will be entitled to disclose information relating to the Agreement/Services of ${shortName} only to regulators and otherwise as required by law. ${shortName} also agrees that, notwithstanding the provisions of the previous paragraph, MSSPL may disclose the identities of ${shortName}'s nominated contacts and information about the terms of this Agreement, the Services and the Fees to any affiliate of MSSPL or subcontractor involved in the performance of the Services. ${shortName} also agrees that MSSPL may use information provided by ${shortName} and MSSPL's other clients to build databases for internal use by MSSPL's employees; these databases are intended to benefit all clients by improving the quality of MSSPL's advice, but MSSPL will not disclose these to any third party in a manner which allows particular clients or individuals to be identified.</p>
    
    <p class="clause">This Agreement is made on the basis that each party is entitled to assume that the other has complied and will continue to comply with its obligations arising from the data protection and privacy laws in force from time to time to the extent that those obligations apply to such party in its role under this Agreement and are relevant to this Agreement.</p>
    <p class="clause">To the extent that MSSPL processes personal data on behalf of ${shortName}, MSSPL confirms that it will act only on the instructions of ${shortName} or someone authorized by ${shortName} for this purpose and ${shortName} will continue to be the owner of such data. MSSPL also confirms that it has taken appropriate administrative, technological and physical safeguards designed to protect the data against loss, destruction, alteration or damage in accordance with applicable law. MSSPL shall not use ${shortName}'s financial, compliance, or organizational data for benchmarking, analytics, AI training, or derivative commercial purposes without prior written consent of ${shortName}.</p>

    <p class="clause"><span class="bold">6 Intellectual Property:</span> Each party acknowledges that the other party and its affiliates, third party service providers and subcontractors will retain all copyright and other intellectual property rights in the methodologies, methods of analysis, ideas, concepts, Know-how, models, tools, techniques, skills, knowledge and experience possessed by each party or such elated parties before carrying out any of the Services, or as acquired during the performance of this Agreement.</p>

    <p class="clause" style="margin-bottom: 0;"><span class="bold">7 Liability for Losses:</span> It is agreed that each party will be liable to the other party for any losses arising</p>

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

  <!-- PAGE 3 -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <p class="clause" style="margin-top: 0;">directly and proximately from any negligence or from any act or omission in breach of this Agreement. For the purposes of this Agreement, "losses" are defined as any loss, damages, direct costs, expenses or any other payment, including, reasonable legal fees, of whatever kind and however incurred, for which the relevant party may come to be liable. The aggregate liability of MSSPL in relation to this Agreement and the SOWs, whether in contract, tort or otherwise, shall not exceed the total amounts received by MSSPL during the last twelve (12) months of the date of the last claim under the Agreement/relevant SOW. In no event shall either party be liable for any indirect, consequential or punitive loss, damage, cost or expense of any nature like loss of profits, loss of revenue, loss of anticipated savings or loss of goodwill.</p>

    <p class="clause">${shortName} acknowledges that MSSPL is an external consultant required to perform specifically identified services in terms of this Agreement. ${shortName} agrees to indemnify, defend and hold harmless MSSPL for all loss suffered or incurred, including as a result of any proceedings or investigation that may be initiated against MSSPL with respect to ${shortName}'s financial reporting, book or record keeping requirements and compliance.</p>

    <p class="clause">The indemnity obligation shall not apply where any loss arises due to MSSPL's negligence, error, omission, delay, or non-performance of services.</p>

    <p class="clause"><span class="bold">8 Unforeseen Events:</span> Neither MSSPL nor ${shortName} can predict delays or failures in performances of their respective obligations under this Agreement resulting from events beyond their reasonable control which include 'acts of God', fire, flood, riots, terrorism, new laws that prevent the carrying out of the Services, the results of terrorist activity, government closures, failures of third party suppliers, and electronic and other power failures. Should such circumstances arise, and continue for sixty (60) days, MSSPL will use its reasonable endeavors to continue to provide the Services. In Such a case, either party may terminate this Agreement by giving sixty (60) days written notice to the other.</p>

    <p class="clause"><span class="bold">9 Duration and Termination of this Agreement:</span> The initial term of this Agreement shall be one year from the Effective Date, with annual automatic renewal unless either party provides notice of its intent not to renew at least sixty (60) days prior to the expiration date. In the event that a party commits a material breach of the Agreement, the other party may terminate the Agreement vide written notice after giving to the other not less than sixty (60) days to remedy such breach. The notice will mention the relevant material breach that needs to be cured. In the event of a ${shortName} initiated termination of the Agreement, any SOW in progress shall Continue until completion and ${shortName}'s obligation to pay Fees in accordance therewith shall continue unchanged. Clause 5 (Confidentiality and Data Protection), Clause 6 (Intellectual Property), Clause 7 (Liability for Losses) and Clause 9 (Duration and Termination of SOW or this Agreement) shall survive termination and upon termination, ${shortName} shall only be liable for services satisfactorily performed up to the termination date.</p>

    <p class="clause" style="margin-bottom: 0;"><span class="bold">10 Notices:</span> Any notice which is to be given by one party to the other under this Agreement will be given in writing. It will be effective if delivered to the address of the other party set out in the corresponding</p>

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

  <!-- PAGE 4 -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <p class="clause" style="margin-top: 0;">SOW -or any other address specified Subsequently. Either party may change its address for service by giving notice to the other party.</p>

    <p class="clause"><span class="bold">11 Other Provisions:</span> Neither this Agreement nor the provision of the Services is intended to confer any right or benefit on any third party. MSSPL may utilize subcontractors, consultants, and third-party providers in the delivery of the Services and will be responsible for the acts and omissions of each such subcontractor, consultant or third-party provider as if they were the acts and omissions of MSSPL. However, MSSPL may not utilize such a person to perform any obligation under this Agreement without ${shortName}'s prior written consent, which consent shall not be unreasonably withheld or delayed.</p>
    
    <p class="clause">MSSPL shall disclose the identity of any subcontractor handling ${shortName} data and ensure such subcontractor signs confidentiality and data protection undertakings equivalent to this Agreement.</p>
    <p class="clause">Neither this Agreement nor any right hereunder may be sold, assigned, or otherwise transferred by either party without the prior written consent of the other.</p>
    <p class="clause">Upon expiry/termination, each receiving Party may destroy paper copies of any correspondence and documents that comprise of Confidential Information of the Disclosing Party, and retain only images thereof,</p>
    <p class="clause">This Agreement sets out the entire agreement between the parties relating to the subject matter of this Agreement and supersedes and replaces any existing agreement between the parties relating to such subject-matter.</p>
    <p class="clause">If any provision of this Agreement (or any portion thereof) is determined to be invalid or unenforceable, the remaining provisions of this Agreement shall not be affected by such determination and shall remain binding upon the parties.</p>
    <p class="clause">This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or relating to this Agreement shall be resolved through arbitration under the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be New Delhi. Proceedings shall be conducted in English.</p>
    <p class="clause">This agreement is being executed in two (2) counterparts with each party retaining one (1) counterpart.</p>

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

  <!-- PAGE 5 — Signature Page -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <p class="clause" style="font-weight:700; margin-bottom: 25px;">ACCEPTED AND AGREED:</p>

    <div style="font-size:12px; line-height: 1.8; margin-bottom: 40px; padding-left: 20px;">
      <p style="margin: 0 0 15px;">For and on behalf of</p>
      <p style="margin: 0 0 10px; font-weight:700;">MERUM SHARED SERVICES PRIVATE LIMITED</p>
      <p style="margin: 0 0 5px;">By:</p>
      <p style="margin: 0 0 5px;">Name: ${merumSignatoryName}</p>
      <p style="margin: 0 0 5px;">Title: ${merumSignatoryTitle}</p>
      <p style="margin: 0 0 35px;">Date:</p>

      <p style="margin: 0 0 15px;">For and on behalf of</p>
      <p style="margin: 0 0 10px; font-weight:700;">${companyName}</p>
      <p style="margin: 0 0 5px;">By:</p>
      <p style="margin: 0 0 5px;">Name: ${signatory}</p>
      <p style="margin: 0 0 5px;">Title: ${designationAuth}</p>
      <p style="margin: 0 0 5px;">Date:</p>
    </div>

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

  <!-- PAGE 4 — Schedules -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <h2 style="font-size:14px; font-weight: 700; text-align: center;">Schedule A -Fees</h2>
    <p class="clause">1. The Fees payable in respect of the Services will be set forth in the applicable SOW</p>
    <p class="clause">2, Fees are exclusive of all taxes, other than income tax. Any applicable tax will be the responsibility of ${shortName} and MSSPL will use reasonable efforts to add such taxes to invoices during performance.</p>
    <p class="clause">3. ${shortName} agrees to pay (or cause to be paid) each invoice within 30 days of the date of the invoice. If any invoice is not paid within 30 days of the date of the invoice, the parties shall escalate within their respective organizations for immediate resolution and payment.</p>

    <br><br>
    
    <h2 style="font-size:14px; font-weight: 700; text-align: center;">Schedule B</h2>
    <h2 style="font-size:14px; font-weight: 700; text-align: center;">SOW</h2>
    <p class="clause" style="margin-bottom:20px;">This Statement of Work (SoW) is being executed pursuant to the Services Agreement dated <span class="bold">${masterAgreementDate}</span> between <span class="bold">MERUM SHARED SERVICES PRIVATE LIMITED</span> (MSSPL) and <span class="bold">${companyName}</span> (${shortName}).</p>
    <p class="clause">This SOW sets out the scope of the Services that MSSPL provides to ${shortName}</p>

    <h4 style="margin:20px 0 10px;font-size:13px;text-transform:uppercase;">SCOPE OF SERVICES listed herein:</h4>
    ${sowHtml || '<p style="color:#888;font-size:13px;">No specific services selected — see engagement letter.</p>'}

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

  <!-- PAGE 5 — Service Levels & Responsibilities -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <h4 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;">SERVICE LEVELS:</h4>
    <table class="fee-table">
      <thead>
        <tr>
          <th>Service Component</th>
          <th>Service Level</th>
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

    <h4 style="margin:30px 0 10px;font-size:13px;text-transform:uppercase; text-align: center;">CLIENT RESPONSIBILITIES</h4>
    <ol style="font-size:12px;padding-left:20px;line-height:1.5;">
      ${responsibilities.map(r => `<li>${r}</li>`).join('')}
    </ol>
    <p class="clause" style="margin-top: 10px;">Note: Any delays in month end closing on account of system unavailability, client information pending, among others (matter escalated to client) might have cascading effect on other deliverables. Further, if volumes of transactions rise beyond 20% of existing load, then additional time may be required as additional resourcing arrangements might have to be done.</p>
    <p class="clause">Mode of communication for inputs, official information and deliverables should be via email or pre agreed shared online platform. Any exceptions to this should be pre aligned in advance.</p>

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

  <!-- PAGE 6 — Fees, Notices & Signatures -->
  <div class="page page-break">
    <div class="agreement-header">
      <div class="logo-container">
        ${logoImg}
      </div>
    </div>

    <p class="clause"><span class="bold">FEES:</span> ${feeText}</p>

    <p class="clause"><span class="bold">Note:</span> Currently, one visit shall be provided at your location upon prior scheduling. The conveyance cost (if required) for such visit shall be borne by the client (${shortName}).</p>

    <br>
    <p class="clause" style="font-weight:700;">Contact Information for Notices:</p>

    <div style="margin-left: 10px; line-height: 1.8; font-size: 12px; margin-bottom: 30px;">
      <p style="margin: 0 0 5px; font-weight: 700;">MERUM SHARED SERVICES PRIVATE LIMITED ("MSSPL")</p>
      <p style="margin: 0 0 5px;">Name: _______________________________</p>
      <p style="margin: 0 0 15px;">Address: _______________________________</p>
      <p style="margin: 0 0 5px;">E-mail: _______________________</p>
      <p style="margin: 0 0 5px;">Phone: _______________________</p>
    </div>

    <div style="margin-left: 10px; line-height: 1.8; font-size: 12px; margin-bottom: 40px;">
      <p style="margin: 0 0 5px; font-weight: 700;">${companyName} ("${shortName}")</p>
      <p style="margin: 0 0 5px;">Name: ${signatory}</p>
      <p style="margin: 0 0 15px;">Address: ${address}</p>
      <p style="margin: 0 0 5px;">E-mail: </p>
      <p style="margin: 0 0 5px;">Phone: _______________________</p>
    </div>

    <p class="clause" style="font-weight:700; margin-top: 30px;">ACCEPTED AND AGREED:</p>

    <div style="display: flex; gap: 40px; margin-top: 30px; font-size: 12px; line-height: 1.8;">
      <div style="flex: 1;">
        <p style="margin: 0 0 40px; font-weight:700;">Merum Shared Services Private Limited</p>
        <p style="margin: 0 0 5px;">Name: ${merumSignatoryName}</p>
        <p style="margin: 0 0 5px;">Title: ${merumSignatoryTitle}</p>
        <p style="margin: 0 0 5px;">Date:</p>
      </div>
      <div style="flex: 1;">
        <p style="margin: 0 0 40px; font-weight:700;">${companyName}</p>
        <p style="margin: 0 0 5px;">Name: ${signatory}</p>
        <p style="margin: 0 0 5px;">Title: ${designationAuth}</p>
        <p style="margin: 0 0 5px;">Date:</p>
      </div>
    </div>

    ${customClausesHtml}

    <div class="agreement-footer">
      <div class="footer-left">
        Address: Shop No 24 Ground Floor, DDA Shop Neeti Bagh,<br>South Ext-II, New Delhi, South Delhi- 110049.
      </div>
      <div class="footer-right">
        CIN No: U70200DL2025PTC452136<br>Contact <a href="mailto:support@merums.com">support@merums.com</a> , mobile 7044067661
      </div>
    </div>
  </div>

</body>
</html>
  `;
}

module.exports = { generateAgreementHTML };
