/**
 * SescoHub branded email templates.
 * One base wrapper (navy header, gold accent, consistent footer) reused by
 * every specific email type, matching the app's own design tokens
 * (--color-shb-navy #0B1220, --color-shb-gold #D4A73B) so emails look like
 * they came from the same product as the dashboard.
 */

const BRAND = {
  navy: '#0B1220',
  navyLight: '#121C2E',
  gold: '#2563EB',
  goldDark: '#1D4ED8',
  goldSoft: '#DBEAFE',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  muted: '#8B93A7',
};

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@sescohub.com';
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || '0814 011 2803';
const APP_URL = process.env.FRONTEND_URL || 'https://sescohub.com';

function naira(n: number) {
  return `\u20a6${Math.abs(Number(n) || 0).toLocaleString()}`;
}

function escapeHtml(str: string) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** Base branded wrapper. `preheader` is the hidden preview text in inbox lists. */
function baseTemplate(opts: { preheader?: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }) {
  const { preheader = '', bodyHtml, ctaLabel, ctaUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SescoHub</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,18,32,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg, ${BRAND.navy}, ${BRAND.navyLight});padding:32px 28px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="width:40px;height:40px;background:linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark});border-radius:12px;text-align:center;vertical-align:middle;font-weight:800;font-size:22px;color:#ffffff;font-family:Georgia,serif;">S</td>
                <td style="padding-left:10px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SescoHub</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 28px;">
            ${bodyHtml}
            ${ctaLabel && ctaUrl ? `
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 4px;">
              <tr><td style="border-radius:12px;background:linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark});">
                <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
              </td></tr>
            </table>` : ''}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 28px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0 0 6px;color:${BRAND.muted};font-size:12px;">Need help? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.goldDark};text-decoration:none;">${SUPPORT_EMAIL}</a> or call ${SUPPORT_PHONE}</p>
            <p style="margin:0;color:#c2c6cf;font-size:11px;">&copy; ${new Date().getFullYear()} SescoHub Digital Marketplace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:${BRAND.muted};font-size:13px;border-bottom:1px solid #f1f1f1;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:${BRAND.navy};font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #f1f1f1;">${value}</td>
  </tr>`;
}

function infoTable(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;padding:4px 16px;margin:16px 0;">${rows.map(([l, v]) => infoRow(l, v)).join('')}</table>`;
}

function statusPill(status: string, color: string) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${color}20;color:${color};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(status)}</span>`;
}

export const emailTemplates = {
  welcome(name: string) {
    return {
      subject: 'Welcome to SescoHub \u2014 your wallet is ready',
      html: baseTemplate({
        preheader: 'Fund your wallet and start buying data, airtime, cable and more.',
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Welcome, ${escapeHtml(name)} \ud83d\udc4b</h1>
          <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.6;">
            Your SescoHub account is ready. Fund your wallet once, then buy mobile data, airtime,
            cable TV subscriptions, electricity tokens, and exam PINs \u2014 all delivered instantly.
          </p>
          <p style="margin:0;color:#444;font-size:14px;line-height:1.6;">
            No subscriptions, no hidden fees. The price you see at checkout is exactly what you pay.
          </p>`,
        ctaLabel: 'Fund Your Wallet',
        ctaUrl: `${APP_URL}/app/wallet`,
      }),
    };
  },

  passwordReset(name: string, resetUrl: string) {
    return {
      subject: 'Reset your SescoHub password',
      html: baseTemplate({
        preheader: 'Use this link to reset your password. It expires in 1 hour.',
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Password reset requested</h1>
          <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.6;">
            Hi ${escapeHtml(name)}, we received a request to reset your SescoHub password. This link
            expires in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>`,
        ctaLabel: 'Reset Password',
        ctaUrl: resetUrl,
      }),
    };
  },

  walletFunded(name: string, amount: number, newBalance: number, reference: string) {
    return {
      subject: `Wallet funded: ${naira(amount)}`,
      html: baseTemplate({
        preheader: `${naira(amount)} was added to your SescoHub wallet.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Wallet funded successfully</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;">Hi ${escapeHtml(name)}, your payment was received.</p>
          ${infoTable([
            ['Amount Added', `<span style="color:${BRAND.success}">+${naira(amount)}</span>`],
            ['New Balance', naira(newBalance)],
            ['Reference', `<code>${escapeHtml(reference)}</code>`],
          ])}`,
        ctaLabel: 'View Wallet',
        ctaUrl: `${APP_URL}/app/wallet`,
      }),
    };
  },

  walletDebited(name: string, amount: number, newBalance: number, reason: string) {
    return {
      subject: `Wallet debited: ${naira(amount)}`,
      html: baseTemplate({
        preheader: `${naira(amount)} was deducted from your SescoHub wallet.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Wallet debited</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;">Hi ${escapeHtml(name)}, an adjustment was made to your wallet balance.</p>
          ${infoTable([
            ['Amount Deducted', `<span style="color:${BRAND.danger}">-${naira(amount)}</span>`],
            ['New Balance', naira(newBalance)],
            ['Reason', escapeHtml(reason || 'Not specified')],
          ])}
          <p style="margin:16px 0 0;color:${BRAND.muted};font-size:12px;">If you didn't expect this, contact support right away.</p>`,
        ctaLabel: 'View Wallet',
        ctaUrl: `${APP_URL}/app/wallet`,
      }),
    };
  },

  loginAlert(name: string, context: { ip?: string; userAgent?: string; time: Date }) {
    return {
      subject: 'New login to your SescoHub account',
      html: baseTemplate({
        preheader: 'We noticed a new login to your account.',
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">New login detected</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;">Hi ${escapeHtml(name)}, your account was just signed into.</p>
          ${infoTable([
            ['Time', context.time.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })],
            ['IP Address', escapeHtml(context.ip || 'Unknown')],
            ['Device', escapeHtml((context.userAgent || 'Unknown').slice(0, 60))],
          ])}
          <p style="margin:16px 0 0;color:${BRAND.muted};font-size:12px;">Wasn't you? Reset your password immediately and contact support.</p>`,
        ctaLabel: 'Not you? Reset Password',
        ctaUrl: `${APP_URL}/reset-password`,
      }),
    };
  },

  purchaseSuccess(name: string, txn: { product: string; recipient?: string; amount: number; ref: string }) {
    return {
      subject: `Order delivered: ${txn.product}`,
      html: baseTemplate({
        preheader: `Your ${txn.product} purchase was delivered successfully.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Order delivered ${statusPill('Success', BRAND.success)}</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;">Hi ${escapeHtml(name)}, your purchase was delivered successfully.</p>
          ${infoTable([
            ['Product', escapeHtml(txn.product)],
            ...(txn.recipient ? [['Recipient', escapeHtml(txn.recipient)] as [string, string]] : []),
            ['Amount', naira(txn.amount)],
            ['Reference', `<code>${escapeHtml(txn.ref)}</code>`],
          ])}`,
        ctaLabel: 'View Receipt',
        ctaUrl: `${APP_URL}/app/transactions`,
      }),
    };
  },

  purchaseFailed(name: string, txn: { product: string; amount: number; ref: string; reason?: string }) {
    return {
      subject: `Order failed \u2014 refunded: ${txn.product}`,
      html: baseTemplate({
        preheader: `Your ${txn.product} order failed and was refunded to your wallet.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Order failed ${statusPill('Refunded', BRAND.danger)}</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;">
            Hi ${escapeHtml(name)}, we couldn't deliver this order. <b>${naira(txn.amount)}</b> has been refunded to your wallet automatically \u2014 no action needed.
          </p>
          ${infoTable([
            ['Product', escapeHtml(txn.product)],
            ['Amount Refunded', naira(txn.amount)],
            ['Reference', `<code>${escapeHtml(txn.ref)}</code>`],
            ...(txn.reason ? [['Reason', escapeHtml(txn.reason)] as [string, string]] : []),
          ])}`,
        ctaLabel: 'View Transactions',
        ctaUrl: `${APP_URL}/app/transactions`,
      }),
    };
  },

  purchasePending(name: string, context: { label: string; amount: number; ref: string }) {
    return {
      subject: `Pending: ${context.label}`,
      html: baseTemplate({
        preheader: `${context.label} is being processed.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Processing ${statusPill('Pending', BRAND.warning)}</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;">Hi ${escapeHtml(name)}, this is being processed and you'll be notified once it completes.</p>
          ${infoTable([
            ['Description', escapeHtml(context.label)],
            ['Amount', naira(context.amount)],
            ['Reference', `<code>${escapeHtml(context.ref)}</code>`],
          ])}`,
      }),
    };
  },

  contactFormAdmin(data: { name: string; email: string; message: string }) {
    return {
      subject: `New contact message from ${data.name}`,
      html: baseTemplate({
        preheader: 'A new contact form submission needs your attention.',
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">New contact message</h1>
          ${infoTable([['Name', escapeHtml(data.name)], ['Email', escapeHtml(data.email)]])}
          <p style="margin:16px 0 0;padding:14px;background:#fafafa;border-radius:10px;color:#333;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(data.message)}</p>`,
      }),
    };
  },

  contactFormConfirmation(name: string) {
    return {
      subject: 'We received your message',
      html: baseTemplate({
        preheader: "Thanks for reaching out \u2014 we'll respond within a few hours.",
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Thanks, ${escapeHtml(name)}!</h1>
          <p style="margin:0;color:#444;font-size:14px;line-height:1.6;">
            We've received your message and our team will get back to you within a few hours.
            For urgent issues, you can also reach us on WhatsApp.
          </p>`,
      }),
    };
  },

  agentApplicationAdmin(data: { name: string; phone: string; email: string; message?: string }) {
    return {
      subject: `New agent application: ${data.name}`,
      html: baseTemplate({
        preheader: 'A new agent application needs review.',
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">New agent application</h1>
          ${infoTable([['Name', escapeHtml(data.name)], ['Phone', escapeHtml(data.phone)], ['Email', escapeHtml(data.email)]])}
          ${data.message ? `<p style="margin:16px 0 0;padding:14px;background:#fafafa;border-radius:10px;color:#333;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(data.message)}</p>` : ''}`,
      }),
    };
  },

  agentApplicationConfirmation(name: string) {
    return {
      subject: 'Your SescoHub agent application was received',
      html: baseTemplate({
        preheader: "We'll review your application and reach out soon.",
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Thanks for applying, ${escapeHtml(name)}!</h1>
          <p style="margin:0;color:#444;font-size:14px;line-height:1.6;">
            We've received your agent application. Our team will review it and reach out to you
            directly with next steps.
          </p>`,
        ctaLabel: 'Explore SescoHub',
        ctaUrl: APP_URL,
      }),
    };
  },

  supportTicketAdmin(data: { name: string; email: string; subject: string; message: string; ticketId: string }) {
    return {
      subject: `[Ticket #${data.ticketId.slice(-6)}] ${data.subject}`,
      html: baseTemplate({
        preheader: `New support ticket from ${data.name}`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">New support ticket</h1>
          ${infoTable([['Name', escapeHtml(data.name)], ['Email', escapeHtml(data.email)], ['Ticket ID', `#${data.ticketId.slice(-6)}`]])}
          <p style="margin:16px 0 0;padding:14px;background:#fafafa;border-radius:10px;color:#333;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(data.message)}</p>`,
      }),
    };
  },

  supportTicketConfirmation(name: string, subject: string, ticketId: string) {
    return {
      subject: `We've received your support request \u2014 #${ticketId.slice(-6)}`,
      html: baseTemplate({
        preheader: 'Our support team will respond soon.',
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Ticket received ${statusPill('Open', BRAND.warning)}</h1>
          <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.6;">
            Hi ${escapeHtml(name)}, we've logged your request "<b>${escapeHtml(subject)}</b>" as
            ticket <b>#${ticketId.slice(-6)}</b>. Our support team will respond soon.
          </p>`,
        ctaLabel: 'Contact Support',
        ctaUrl: `${APP_URL}/app/support`,
      }),
    };
  },

  adminReply(name: string, subject: string, replyMessage: string, ticketId: string) {
    return {
      subject: `Re: ${subject} \u2014 #${ticketId.slice(-6)}`,
      html: baseTemplate({
        preheader: 'The SescoHub support team replied to your ticket.',
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Support team replied</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;">Hi ${escapeHtml(name)}, regarding "<b>${escapeHtml(subject)}</b>":</p>
          <p style="margin:0;padding:14px;background:#fafafa;border-left:3px solid ${BRAND.gold};border-radius:10px;color:#333;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(replyMessage)}</p>`,
        ctaLabel: 'View Ticket',
        ctaUrl: `${APP_URL}/app/support`,
      }),
    };
  },

  systemAnnouncement(title: string, bodyText: string, ctaLabel?: string, ctaUrl?: string) {
    return {
      subject: title,
      html: baseTemplate({
        preheader: title,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">${escapeHtml(title)}</h1>
          <p style="margin:0;color:#444;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(bodyText)}</p>`,
        ctaLabel,
        ctaUrl,
      }),
    };
  },

  // ── Module 4: Retry & Manual Processing ──────────────────────
  retryInitiated(name: string, product: string, ref: string) {
    return {
      subject: `We're retrying your order: ${product}`,
      html: baseTemplate({
        preheader: `Our team is re-attempting delivery of your ${product} order.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Retrying your order ${statusPill('In Progress', BRAND.warning)}</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;line-height:1.6;">
            Hi ${escapeHtml(name)}, our team is re-attempting delivery of your order. We'll email you as soon as it completes.
          </p>
          ${infoTable([['Product', escapeHtml(product)], ['Reference', `<code>${escapeHtml(ref)}</code>`]])}`,
      }),
    };
  },

  retrySucceeded(name: string, txn: { product: string; amount: number; ref: string }) {
    return {
      subject: `Resolved: ${txn.product} delivered`,
      html: baseTemplate({
        preheader: `Good news — your ${txn.product} order was delivered on retry.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Order delivered ${statusPill('Success', BRAND.success)}</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;line-height:1.6;">
            Hi ${escapeHtml(name)}, good news — we retried your order and it was delivered successfully.
          </p>
          ${infoTable([
            ['Product', escapeHtml(txn.product)],
            ['Amount', naira(txn.amount)],
            ['Reference', `<code>${escapeHtml(txn.ref)}</code>`],
          ])}`,
        ctaLabel: 'View Receipt',
        ctaUrl: `${APP_URL}/app/transactions`,
      }),
    };
  },

  retryFailedPermanently(name: string, txn: { product: string; amount: number; ref: string }) {
    return {
      subject: `Order could not be completed: ${txn.product}`,
      html: baseTemplate({
        preheader: `We were unable to deliver your ${txn.product} order after multiple attempts.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Order unsuccessful ${statusPill('Refunded', BRAND.danger)}</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;line-height:1.6;">
            Hi ${escapeHtml(name)}, despite multiple attempts we were unable to deliver this order. <b>${naira(txn.amount)}</b> remains
            safely in your wallet. Our team has been notified and may follow up if needed.
          </p>
          ${infoTable([['Product', escapeHtml(txn.product)], ['Reference', `<code>${escapeHtml(txn.ref)}</code>`]])}`,
        ctaLabel: 'Contact Support',
        ctaUrl: `${APP_URL}/app/support`,
      }),
    };
  },

  manualRefund(name: string, amount: number, reason: string) {
    return {
      subject: `Wallet refund: ${naira(amount)}`,
      html: baseTemplate({
        preheader: `${naira(amount)} was credited to your wallet by our support team.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Wallet refunded</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;line-height:1.6;">
            Hi ${escapeHtml(name)}, our team has credited your wallet following a manual review.
          </p>
          ${infoTable([['Amount Refunded', `<span style="color:${BRAND.success}">+${naira(amount)}</span>`], ['Reason', escapeHtml(reason)]])}`,
        ctaLabel: 'View Wallet',
        ctaUrl: `${APP_URL}/app/wallet`,
      }),
    };
  },

  manualReviewCompleted(name: string, product: string, outcome: 'approved' | 'rejected' | 'completed', notes?: string) {
    const outcomeMeta = {
      approved: { label: 'Approved', color: BRAND.success },
      completed: { label: 'Completed', color: BRAND.success },
      rejected: { label: 'Rejected', color: BRAND.danger },
    }[outcome];
    return {
      subject: `Review update: ${product}`,
      html: baseTemplate({
        preheader: `Your order has been manually reviewed.`,
        bodyHtml: `
          <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.navy};">Manual review completed ${statusPill(outcomeMeta.label, outcomeMeta.color)}</h1>
          <p style="margin:0 0 8px;color:#444;font-size:14px;line-height:1.6;">
            Hi ${escapeHtml(name)}, our team has finished reviewing your order "<b>${escapeHtml(product)}</b>".
          </p>
          ${notes ? `<p style="margin:12px 0 0;padding:14px;background:#fafafa;border-radius:10px;color:#333;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(notes)}</p>` : ''}`,
        ctaLabel: 'View Transactions',
        ctaUrl: `${APP_URL}/app/transactions`,
      }),
    };
  },
};
