import { forwardRef } from 'react';
import { formatNaira, formatDate, type Transaction } from '../lib/api';
import { useSupportSettings } from '../context/SupportSettingsContext';

export type ReceiptCustomer = { name: string; email: string };

/**
 * Branded receipt body. Rendered both on-screen (inside the Transactions
 * drawer) and captured by jsPDF for the "Download PDF" action. Also the
 * target of window.print() via the .receipt-print-area rule in index.css,
 * so it works standalone as a print stylesheet target too.
 */
const TransactionReceipt = forwardRef<HTMLDivElement, { txn: Transaction; customer: ReceiptCustomer; status: string }>(
  ({ txn, customer, status }, ref) => {
    const statusColor = status === 'delivered' ? '#22C55E' : status === 'failed' ? '#EF4444' : '#F59E0B';
    const { supportEmail } = useSupportSettings();

    return (
      <div ref={ref} className="receipt-print-area bg-white rounded-2xl overflow-hidden border border-gray-100" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <div className="px-4 py-4 sm:px-6 sm:py-6 text-white" style={{ background: 'linear-gradient(135deg, #0B1220, #121C2E)' }}>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-extrabold text-base sm:text-lg" style={{ background: 'linear-gradient(135deg, #D4A73B, #B78B25)', color: '#0B1220' }}>S</div>
            <span className="text-lg sm:text-xl font-extrabold">SescoHub</span>
          </div>
          <p className="text-gray-300 text-[10px] sm:text-xs mt-2 sm:mt-3 uppercase tracking-widest font-bold">Payment Receipt</p>
        </div>

        {/* Status banner */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Amount</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900">{formatNaira(Math.abs(txn.amount))}</p>
          </div>
          <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wide" style={{ background: `${statusColor}20`, color: statusColor }}>
            {status}
          </span>
        </div>

        {/* Details */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Customer</p>
            <p className="text-sm font-bold text-gray-900">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.email}</p>
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Service Details</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Product</dt><dd className="font-bold text-gray-900 text-right">{txn.product}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Category</dt><dd className="font-bold text-gray-900 text-right capitalize">{txn.category}</dd></div>
              {txn.recipient && <div className="flex justify-between"><dt className="text-gray-500">Recipient</dt><dd className="font-mono font-bold text-gray-900 text-right">{txn.recipient}</dd></div>}
            </dl>
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction Info</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Transaction ID</dt><dd className="font-mono text-xs font-bold text-gray-900 text-right break-all">{txn.id}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Reference Number</dt><dd className="font-mono text-xs font-bold text-gray-900 text-right break-all">{txn.ref}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Date &amp; Time</dt><dd className="font-bold text-gray-900 text-right">{formatDate(txn.date)}</dd></div>
            </dl>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10.5px] sm:text-[11px] text-gray-400">Need help with this transaction? {supportEmail}</p>
        </div>
      </div>
    );
  },
);

TransactionReceipt.displayName = 'TransactionReceipt';
export default TransactionReceipt;
