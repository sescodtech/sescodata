import nodemailer from 'nodemailer';
import axios from 'axios';
import { emailTemplates } from '../emails/templates';

const FROM_NAME = 'SescoHub';
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@sescohub.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '';

let cachedTransporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (cachedTransporter !== undefined) return cachedTransporter;
  if (process.env.SMTP_HOST && process.env.EMAIL_USER) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  } else {
    cachedTransporter = null;
  }
  return cachedTransporter;
}

/**
 * Core delivery function used by every specific email below. Tries SMTP
 * first, falls back to Resend's HTTP API if configured, and falls back to a
 * console log in development so the app never crashes or silently loses a
 * notification just because no email provider is configured yet.
 * Every call is fire-and-forget from the caller's perspective — a failed
 * email must never fail the underlying business operation (registration,
 * purchase, wallet funding, etc).
 */
async function deliver(to: string, subject: string, html: string) {
  if (!to) return;
  try {
    const transporter = getTransporter();
    if (transporter) {
      await transporter.sendMail({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to, subject, html });
      return;
    }
    if (process.env.RESEND_API_KEY) {
      await axios.post(
        'https://api.resend.com/emails',
        { from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html },
        { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } },
      );
      return;
    }
    // No provider configured — log instead of failing silently or crashing.
    console.log(`[EmailService] No SMTP/Resend configured — would have sent "${subject}" to ${to}`);
  } catch (e: any) {
    console.error(`[EmailService] Failed to send "${subject}" to ${to}:`, e.message);
  }
}

export class EmailService {
  static async sendWelcome(user: { name: string; email: string }) {
    const { subject, html } = emailTemplates.welcome(user.name);
    await deliver(user.email, subject, html);
  }

  static async sendPasswordReset(user: { name: string; email: string }, resetUrl: string) {
    const { subject, html } = emailTemplates.passwordReset(user.name, resetUrl);
    await deliver(user.email, subject, html);
  }

  static async sendWalletFunded(user: { name: string; email: string }, amount: number, newBalance: number, reference: string) {
    const { subject, html } = emailTemplates.walletFunded(user.name, amount, newBalance, reference);
    await deliver(user.email, subject, html);
  }

  static async sendWalletDebited(user: { name: string; email: string }, amount: number, newBalance: number, reason: string) {
    const { subject, html } = emailTemplates.walletDebited(user.name, amount, newBalance, reason);
    await deliver(user.email, subject, html);
  }

  static async sendLoginAlert(user: { name: string; email: string }, context: { ip?: string; userAgent?: string; time: Date }) {
    const { subject, html } = emailTemplates.loginAlert(user.name, context);
    await deliver(user.email, subject, html);
  }

  static async sendPurchaseSuccess(user: { name: string; email: string }, txn: { product: string; recipient?: string; amount: number; ref: string }) {
    const { subject, html } = emailTemplates.purchaseSuccess(user.name, txn);
    await deliver(user.email, subject, html);
  }

  static async sendPurchaseFailed(user: { name: string; email: string }, txn: { product: string; amount: number; ref: string; reason?: string }) {
    const { subject, html } = emailTemplates.purchaseFailed(user.name, txn);
    await deliver(user.email, subject, html);
  }

  static async sendPurchasePending(user: { name: string; email: string }, context: { label: string; amount: number; ref: string }) {
    const { subject, html } = emailTemplates.purchasePending(user.name, context);
    await deliver(user.email, subject, html);
  }

  static async sendContactFormNotifications(data: { name: string; email: string; message: string }) {
    const admin = emailTemplates.contactFormAdmin(data);
    const confirm = emailTemplates.contactFormConfirmation(data.name);
    await Promise.all([
      deliver(ADMIN_EMAIL, admin.subject, admin.html),
      deliver(data.email, confirm.subject, confirm.html),
    ]);
  }

  static async sendAgentApplicationNotifications(data: { name: string; phone: string; email: string; message?: string }) {
    const admin = emailTemplates.agentApplicationAdmin(data);
    const confirm = emailTemplates.agentApplicationConfirmation(data.name);
    await Promise.all([
      deliver(ADMIN_EMAIL, admin.subject, admin.html),
      deliver(data.email, confirm.subject, confirm.html),
    ]);
  }

  static async sendSupportTicketNotifications(data: { name: string; email: string; subject: string; message: string; ticketId: string }) {
    const admin = emailTemplates.supportTicketAdmin(data);
    const confirm = emailTemplates.supportTicketConfirmation(data.name, data.subject, data.ticketId);
    await Promise.all([
      deliver(ADMIN_EMAIL, admin.subject, admin.html),
      deliver(data.email, confirm.subject, confirm.html),
    ]);
  }

  static async sendAdminReply(user: { name: string; email: string }, subject: string, replyMessage: string, ticketId: string) {
    const { subject: emailSubject, html } = emailTemplates.adminReply(user.name, subject, replyMessage, ticketId);
    await deliver(user.email, emailSubject, html);
  }

  static async sendSystemAnnouncement(user: { email: string }, title: string, bodyText: string, ctaLabel?: string, ctaUrl?: string) {
    const { subject, html } = emailTemplates.systemAnnouncement(title, bodyText, ctaLabel, ctaUrl);
    await deliver(user.email, subject, html);
  }

  // ── Module 4: Retry & Manual Processing ──────────────────────
  static async sendRetryInitiated(user: { name: string; email: string }, product: string, ref: string) {
    const { subject, html } = emailTemplates.retryInitiated(user.name, product, ref);
    await deliver(user.email, subject, html);
  }

  static async sendRetrySucceeded(user: { name: string; email: string }, txn: { product: string; amount: number; ref: string }) {
    const { subject, html } = emailTemplates.retrySucceeded(user.name, txn);
    await deliver(user.email, subject, html);
  }

  static async sendRetryFailedPermanently(user: { name: string; email: string }, txn: { product: string; amount: number; ref: string }) {
    const { subject, html } = emailTemplates.retryFailedPermanently(user.name, txn);
    await deliver(user.email, subject, html);
  }

  static async sendManualRefund(user: { name: string; email: string }, amount: number, reason: string) {
    const { subject, html } = emailTemplates.manualRefund(user.name, amount, reason);
    await deliver(user.email, subject, html);
  }

  static async sendManualReviewCompleted(user: { name: string; email: string }, product: string, outcome: 'approved' | 'rejected' | 'completed', notes?: string) {
    const { subject, html } = emailTemplates.manualReviewCompleted(user.name, product, outcome, notes);
    await deliver(user.email, subject, html);
  }
}
