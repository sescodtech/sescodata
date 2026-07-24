import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface ConfirmActionField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number';
  required?: boolean;
}

/**
 * Every sensitive Module 4 action (retry, refund, reverse, approve, reject,
 * complete) needs: a confirmation step, a mandatory reason, and sometimes
 * one extra field (provider reference, override amount). One dialog covers
 * all of them instead of ~10 near-identical modals.
 */
export default function ConfirmActionDialog({
  open, onClose, onConfirm, title, description, tone = 'default', confirmLabel = 'Confirm', extraFields = [],
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, extra: Record<string, string>) => Promise<void>;
  title: string;
  description?: string;
  tone?: 'default' | 'danger';
  confirmLabel?: string;
  extraFields?: ConfirmActionField[];
}) {
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setReason(''); setExtra({}); setError(''); }
  }, [open]);

  const missingRequired = extraFields.some((f) => f.required && !extra[f.key]?.trim());

  const handleConfirm = async () => {
    if (!reason.trim()) { setError('A reason is required for this action.'); return; }
    if (missingRequired) { setError('Please fill in all required fields.'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim(), extra);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Action failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 z-[60]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
          >
            <div className="admin-shell bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-start justify-between p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-admin-blue-soft text-admin-blue')}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-admin-navy">{title}</h3>
                    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
                  </div>
                </div>
                <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
              </div>

              <div className="p-4 space-y-3">
                {extraFields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-gray-600 block mb-1">{f.label}{f.required && ' *'}</label>
                    <input
                      type={f.type || 'text'}
                      value={extra[f.key] || ''}
                      onChange={(e) => setExtra((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Reason *</label>
                  <textarea
                    value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder="Explain why you're taking this action — this is recorded in the audit trail."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue resize-none"
                  />
                </div>
                {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
              </div>

              <div className="flex gap-2 p-4 pt-0">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60',
                    tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'admin-btn-primary !py-2.5')}
                >
                  {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
