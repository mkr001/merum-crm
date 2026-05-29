const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Merum CRM" <crm@merums.com>',
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

const sendWelcomeEmail = async (to, password) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const subject = 'Welcome to Merum CRM - Client Portal Access';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e6e0; border-radius: 8px;">
      <h2 style="color: #C70073;">Welcome to Merum CRM</h2>
      <p>Your client portal account has been created. You can log in to complete your onboarding process and track your progress.</p>
      <div style="background: #f8f7f4; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #534ab7;">${loginUrl}</a></p>
        <p style="margin: 0 0 10px;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
      </div>
      <p style="font-size: 13px; color: #666;">For security reasons, please change your password after your first login.</p>
    </div>
  `;
  return sendEmail(to, subject, html);
};

const sendAgreementEmail = async (to, companyName) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const subject = 'Action Required: Your Service Agreement is Ready';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e6e0; border-radius: 8px;">
      <h2 style="color: #C70073;">Service Agreement Ready</h2>
      <p>Hello ${companyName},</p>
      <p>Your onboarding has been reviewed and your Service Agreement is now ready for your review and signature.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}/onboarding" style="background: #2d9d78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Log In to View Agreement
        </a>
      </div>
      <p style="font-size: 13px; color: #666;">If you have any questions, please reach out to your account manager.</p>
    </div>
  `;
  return sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendAgreementEmail
};
