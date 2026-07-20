import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, CheckCircle2, XCircle, ShieldCheck, ArrowDownLeft, ArrowUpRight,
  StickyNote, Clock, User as UserIcon, AlertCircle, Link as LinkIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { adminOperations, formatNaira, formatDate, type OperationsTransaction, type TimelineEvent } from '../../lib/api';
import Drawer from '../Drawer';
import StatusBadge from '../StatusBadge';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';
import ConfirmActionDialog from './ConfirmActionDialog';

type DialogKind = 'retry' | 'approve' | 'reject' | 'complete' | 'refund' | 'reverse' | 'flag' | null;

export default function AdminOperationsDrawer({
  transactionId, open, onClose, onUpdated,
}: {
  transactionId: string | null; open: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const [txn, setTxn] = useState<OperationsTransaction | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [noteText, setNoteText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const load = useCallback(async () => {
    if (!transactionId) return;
    setIsLoading(true);
    try {
      const res = await adminOperations.timeline(transactionId);
      setTxn(res.transaction);
      setTimeline(res.timeline);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load transaction');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => { if (open && transactionId) load(); }, [open, transactionId, load]);

  const refresh = async () => { await load(); onUpdated(); };

  const handleAddNote = async () => {
    if (!txn || !noteText.trim()) return;
    setIsAddingNote(true);
    try {
      await adminOperations.addNote(txn._id, noteText.trim(), evidenceUrl.trim() || undefined);
      setNoteText(''); setEvidenceUrl('');
      toast.success('Note added');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (!open) return null;

  const user = txn && typeof txn.userId === 'object' ? txn.userId : null;
  const eligibility = txn?.retryEligibility;

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Transaction Operations">
        {isLoading ? (
          <SkeletonList rows={6} />
        ) : !txn ? (
          <EmptyState tone="admin" icon={AlertCircle} title="Couldn't load this transaction" />
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="min-w-0">
                <p className="font-extrabold text-admin-navy truncate">{txn.product?.name || txn.type}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{txn.paymentReference}</p>
                {user && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><UserIcon size={11} /> {user.name} · {user.email}</p>}
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-extrabold text-admin-navy">{formatNaira(Math.abs(txn.amount))}</p>
                <StatusBadge status={txn.deliveryStatus} className="mt-1" />
              </div>
            </div>

            {/* Retry section */}
            {txn.deliveryStatus === 'failed' && (
              <section>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Retry</p>
                {eligibility && !eligibility.eligible && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">{eligibility.reason}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Clock size={12} /> Retried {txn.retryCount} time{txn.retryCount !== 1 ? 's' : ''}
                  {txn.failReason && <span className="truncate">· {txn.failReason}</span>}
                </div>
                <button
                  onClick={() => setDialog('retry')}
                  disabled={eligibility ? !eligibility.eligible : false}
                  className="admin-btn-primary w-full !py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={15} /> Retry Transaction
                </button>
              </section>
            )}

            {/* Manual Processing section */}
            <section className="pt-4 border-t border-gray-50 space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ShieldCheck size={11} /> Manual Processing
              </p>
              {txn.manualReview.status !== 'none' && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">Review status:</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                    txn.manualReview.status === 'approved' || txn.manualReview.status === 'completed' ? 'bg-green-50 text-green-700' :
                    txn.manualReview.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                    {txn.manualReview.status}
                  </span>
                </div>
              )}

              {txn.manualReview.status === 'none' && txn.deliveryStatus !== 'delivered' && (
                <button onClick={() => setDialog('flag')} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors">
                  Flag for Manual Review <ShieldCheck size={15} />
                </button>
              )}

              {txn.manualReview.status === 'pending' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setDialog('approve')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button onClick={() => setDialog('reject')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {txn.deliveryStatus !== 'delivered' && (
                <button onClick={() => setDialog('complete')} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold bg-admin-blue-soft text-admin-blue hover:brightness-95 transition-all">
                  Mark as Completed (Manual Fulfilment) <CheckCircle2 size={15} />
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setDialog('refund')} disabled={txn.refundedManually} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40">
                  <ArrowDownLeft size={14} /> {txn.refundedManually ? 'Refunded' : 'Refund Wallet'}
                </button>
                <button onClick={() => setDialog('reverse')} disabled={txn.reversedManually} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40">
                  <ArrowUpRight size={14} /> {txn.reversedManually ? 'Reversed' : 'Reverse Wallet'}
                </button>
              </div>

              {txn.manualReview.providerReference && (
                <p className="text-xs text-gray-500 pt-1">Provider ref: <span className="font-mono font-bold text-gray-700">{txn.manualReview.providerReference}</span></p>
              )}
              {txn.manualReview.evidenceUrl && (
                <a href={txn.manualReview.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-admin-blue font-bold flex items-center gap-1 hover:underline">
                  <LinkIcon size={11} /> View attached evidence
                </a>
              )}
            </section>

            {/* Notes */}
            <section className="pt-4 border-t border-gray-50">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><StickyNote size={11} /> Internal Notes</p>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a processing note..." rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue resize-none mb-2" />
              <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Evidence URL (optional — screenshot, provider export, etc.)"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-admin-blue mb-2" />
              <button onClick={handleAddNote} disabled={isAddingNote || !noteText.trim()} className="admin-btn-secondary w-full !py-2 text-sm">
                Add Note
              </button>
            </section>

            {/* Timeline */}
            <section className="pt-4 border-t border-gray-50">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Clock size={11} /> Processing Timeline</p>
              <div className="space-y-3">
                {timeline.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                      e.type === 'retry_success' ? 'bg-green-500' : e.type === 'retry_failed' ? 'bg-red-500' : 'bg-admin-blue')} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800">{e.label}</p>
                      {e.detail && <p className="text-[11px] text-gray-500">{e.detail}</p>}
                      <p className="text-[10px] text-gray-400">{e.admin ? `${e.admin} · ` : ''}{formatDate(e.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </Drawer>

      {txn && (
        <>
          <ConfirmActionDialog
            open={dialog === 'retry'} onClose={() => setDialog(null)} title="Retry Transaction"
            description="Re-debits the wallet and re-attempts delivery through the provider."
            confirmLabel="Retry Now"
            onConfirm={async (reason) => {
              const res = await adminOperations.retry(txn._id, reason);
              toast[res.retrySucceeded ? 'success' : 'error'](res.retrySucceeded ? 'Retry succeeded — order delivered' : `Retry failed: ${res.error}`);
              await refresh();
            }}
          />
          <ConfirmActionDialog
            open={dialog === 'flag'} onClose={() => setDialog(null)} title="Flag for Manual Review" confirmLabel="Flag"
            onConfirm={async (reason) => { await adminOperations.flagForReview(txn._id, reason); toast.success('Flagged for review'); await refresh(); }}
          />
          <ConfirmActionDialog
            open={dialog === 'approve'} onClose={() => setDialog(null)} title="Approve Transaction" confirmLabel="Approve"
            extraFields={[{ key: 'providerReference', label: 'Provider Reference (optional)', placeholder: 'e.g. GTD-2024-8821' }]}
            onConfirm={async (reason, extra) => { await adminOperations.approve(txn._id, reason, extra.providerReference); toast.success('Transaction approved'); await refresh(); }}
          />
          <ConfirmActionDialog
            open={dialog === 'reject'} onClose={() => setDialog(null)} title="Reject Transaction" tone="danger" confirmLabel="Reject"
            description="The customer will be notified by email that this review was rejected."
            onConfirm={async (reason) => { await adminOperations.reject(txn._id, reason); toast.success('Transaction rejected'); await refresh(); }}
          />
          <ConfirmActionDialog
            open={dialog === 'complete'} onClose={() => setDialog(null)} title="Mark as Completed" confirmLabel="Mark Completed"
            description="Confirms the provider fulfilled this order outside our system. Requires a provider reference."
            extraFields={[{ key: 'providerReference', label: 'Manual Provider Reference', placeholder: 'e.g. GTD-2024-8821', required: true }]}
            onConfirm={async (reason, extra) => { await adminOperations.markCompleted(txn._id, reason, extra.providerReference); toast.success('Marked as completed'); await refresh(); }}
          />
          <ConfirmActionDialog
            open={dialog === 'refund'} onClose={() => setDialog(null)} title="Refund Wallet" confirmLabel="Refund"
            description={`Credits the customer's wallet. Defaults to ${formatNaira(Math.abs(txn.amount))} unless overridden.`}
            extraFields={[{ key: 'amount', label: 'Amount (optional override)', type: 'number', placeholder: String(Math.abs(txn.amount)) }]}
            onConfirm={async (reason, extra) => { await adminOperations.refund(txn._id, reason, extra.amount ? Number(extra.amount) : undefined); toast.success('Wallet refunded'); await refresh(); }}
          />
          <ConfirmActionDialog
            open={dialog === 'reverse'} onClose={() => setDialog(null)} title="Reverse Wallet" tone="danger" confirmLabel="Reverse"
            description={`Debits the customer's wallet to undo an erroneous credit. Defaults to ${formatNaira(Math.abs(txn.amount))} unless overridden.`}
            extraFields={[{ key: 'amount', label: 'Amount (optional override)', type: 'number', placeholder: String(Math.abs(txn.amount)) }]}
            onConfirm={async (reason, extra) => { await adminOperations.reverse(txn._id, reason, extra.amount ? Number(extra.amount) : undefined); toast.success('Wallet reversed'); await refresh(); }}
          />
        </>
      )}
    </>
  );
}
