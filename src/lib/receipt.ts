import { formatNaira, formatDate, type Transaction } from './api';
import type { ReceiptCustomer } from '../components/TransactionReceipt';

const NAVY = '#0B1220';
const GOLD = '#2563EB';
const MUTED = '#8B93A7';

/**
 * Generates and downloads a real PDF receipt — vector text, not a screenshot.
 * jsPDF is dynamically imported here (not at module scope) so its ~1MB of
 * dependencies (it pulls in html2canvas internally) only ever load if the
 * user actually clicks "Download PDF", instead of bloating the main bundle
 * that every visitor downloads on first load.
 */
export async function downloadReceiptPdf(txn: Transaction, customer: ReceiptCustomer, status: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 0;

  // Header band
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageWidth, 90, 'F');
  doc.setFillColor(GOLD);
  doc.roundedRect(margin, 24, 34, 34, 8, 8, 'F');
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('S', margin + 17, 47, { align: 'center' });
  doc.setTextColor('#FFFFFF');
  doc.setFontSize(20);
  doc.text('SescoHub', margin + 46, 47);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#D9DEE8');
  doc.text('PAYMENT RECEIPT', margin + 46, 62);

  y = 130;
  doc.setTextColor(MUTED);
  doc.setFontSize(9);
  doc.text('AMOUNT', margin, y);
  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(formatNaira(Math.abs(txn.amount)), margin, y + 26);

  doc.setFontSize(10);
  doc.setTextColor(status === 'delivered' ? '#16A34A' : status === 'failed' ? '#DC2626' : '#D97706');
  doc.text(status.toUpperCase(), pageWidth - margin, y, { align: 'right' });

  y += 60;
  doc.setDrawColor('#EEEEEE');
  doc.line(margin, y, pageWidth - margin, y);
  y += 28;

  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY);
    doc.text(value, pageWidth - margin, y, { align: 'right', maxWidth: 320 });
    y += 22;
  };

  const section = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(GOLD);
    doc.text(title.toUpperCase(), margin, y);
    y += 18;
  };

  section('Customer');
  row('Name', customer.name);
  row('Email', customer.email);
  y += 10;

  section('Service Details');
  row('Product', txn.product);
  row('Category', txn.category);
  if (txn.recipient) row('Recipient', txn.recipient);
  y += 10;

  section('Transaction Info');
  row('Transaction ID', txn.id);
  row('Reference Number', txn.ref);
  row('Date & Time', formatDate(txn.date));

  doc.setDrawColor('#EEEEEE');
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text('Need help with this transaction? support@sescohub.com', pageWidth / 2, y + 28, { align: 'center' });

  doc.save(`SescoHub-Receipt-${txn.ref}.pdf`);
}

/** Print just the receipt via the browser's native print dialog (isolated by print CSS). */
export function printReceipt() {
  window.print();
}

/** Web Share API with a sensible clipboard fallback for browsers/desktops without it. */
export async function shareReceipt(txn: Transaction) {
  const text = `SescoHub Receipt\n${txn.product}\nAmount: ${formatNaira(Math.abs(txn.amount))}\nRef: ${txn.ref}\nDate: ${formatDate(txn.date)}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'SescoHub Receipt', text });
      return { shared: true };
    } catch {
      return { shared: false }; // user cancelled — not an error
    }
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return { shared: true, copiedToClipboard: true };
  }

  return { shared: false };
}
