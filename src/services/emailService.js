/**
 * ============================================================
 * FILE: src/services/emailService.js
 * PURPOSE: Sends transactional emails
 *
 * WHY THIS FILE EXISTS:
 * Centralizes all email sending logic.
 * We use Nodemailer with Gmail SMTP.
 *
 * Emails sent:
 * - Password reset link
 * - Account welcome email
 * - Security alerts
 * ============================================================
 */

const nodemailer = require("nodemailer");

// Create email transporter once (reused for all emails)
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Use TLS (not SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * sendEmail - Base function for sending any email
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Smile Dental <noreply@smiledental.com>",
      to,
      subject,
      html,
    });
  } catch (error) {
    // Log but don't crash — email failure shouldn't break the app
    console.error("Email send failed:", error.message);
    throw error;
  }
};

/**
 * sendPasswordResetEmail - Sends password reset link
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl, expiresInHours }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00897B; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">🦷 Smile Dental</h1>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1a1a2e;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #00897B; color: white; padding: 14px 28px;
                    text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link expires in ${expiresInHours} hour(s).
          If you didn't request this, please ignore this email.
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          If the button doesn't work, copy this link:<br>
          <a href="${resetUrl}" style="color: #00897B;">${resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: "Reset Your Smile Dental Password",
    html,
  });
};

/**
 * sendWelcomeEmail - Sends welcome email to new users
 */
const sendWelcomeEmail = async ({ to, name, role, loginUrl, tempPassword }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00897B; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">🦷 Smile Dental</h1>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1a1a2e;">Welcome to Smile Dental! 👋</h2>
        <p>Hi ${name},</p>
        <p>Your account has been created with the role: <strong>${role}</strong></p>
        <div style="background: #E0F2F1; border: 1px solid #B2DFDB; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 8px 0 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color: #E65100; font-weight: bold;">⚠️ Please change your password after first login.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}"
             style="background: #00897B; color: white; padding: 14px 28px;
                    text-decoration: none; border-radius: 8px; font-weight: bold;">
            Login Now
          </a>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: "Welcome to Smile Dental — Your Account Details",
    html,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
