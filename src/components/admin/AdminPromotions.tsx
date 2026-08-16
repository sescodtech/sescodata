import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, Megaphone, Loader2, X, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, formatDate, type Promotion } from '../../lib/api';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';

type FormState = {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  startDate: string;
  endDate: string;
  sortOrder: string;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  ctaText: '',
  ctaLink: '',
  startDate: '',
  endDate: '',
  sortOrder: '0',
  enabled: true,
};

function toDateInputValue(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function promotionStatus(p: Promotion): { label: string; tone: 'green' | 'gray' | 'amber' | 'red' } {
  if (!p.enabled) return { label: 'Disabled', tone: 'gray' };
  const now = Date.now();
  const start = new Date(p.startDate).getTime();
  const end = new Date(p.endDate).getTime();
  if (now < start) return { label: 'Scheduled', tone: 'amber' };
  if (now > end) return { label: 'Expired', tone: 'red' };
  return { label: 'Active', tone: 'green' };
}

const STATUS_STYLES: Record<string, string> = {
  green: 'bg-green-50 text-green-600',
  gray: 'bg-gray-100 text-gray-500',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
};

/** Create/Edit modal — one form covers both since the fields are identical. */
function PromotionFormModal({
  open, initial, onClose, onSubmit,
}: {
  open: boolean;
  initial: FormState;
  onClose: () => void;
  onSubmit: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setForm(initial); setError(''); }
  }, [open, initial]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    if (!form.startDate || !form.endDate) { setError('Start and end dates are required.'); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { setError('End date must be on or after the start date.'); return; }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-[60]" />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="admin-shell bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-3.5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-admin-blue-soft text-admin-blue flex items-center justify-center shrink-0">
                <Megaphone size={15} />
              </div>
              <h3 className="font-bold text-admin-navy text-[13.5px]">{initial.title ? 'Edit Promotion' : 'Create Promotion'}</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
          </div>

          <div className="p-3.5 space-y-3 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Title *</label>
              <input
                value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120}
                placeholder="e.g. Weekend Data Bonus"
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Description *</label>
              <textarea
                value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} maxLength={500}
                placeholder="Short description shown on the dashboard card"
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">CTA Text (optional)</label>
                <input
                  value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} maxLength={40}
                  placeholder="e.g. Buy Now"
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">CTA Link (optional)</label>
                <input
                  value={form.ctaLink} onChange={(e) => set('ctaLink', e.target.value)}
                  placeholder="/app/buy-data"
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Start Date *</label>
                <input
                  type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">End Date *</label>
                <input
                  type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 items-end">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Sort Order</label>
                <input
                  type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                />
              </div>
              <label className="flex items-center gap-2 pb-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="w-4 h-4 accent-admin-blue" />
                <span className="text-[12.5px] font-bold text-gray-700">Enabled</span>
              </label>
            </div>
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          </div>

          <div className="flex gap-2 p-3.5 pt-0 shrink-0">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-[12.5px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-lg text-[12.5px] font-bold text-white admin-btn-primary !py-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {initial.title ? 'Save Changes' : 'Create Promotion'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await admin.listPromotions();
      setPromotions(res.promotions);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: Promotion) => { setEditing(p); setModalOpen(true); };

  const formFor = (p: Promotion | null): FormState => p ? {
    title: p.title,
    description: p.description,
    ctaText: p.ctaText || '',
    ctaLink: p.ctaLink || '',
    startDate: toDateInputValue(p.startDate),
    endDate: toDateInputValue(p.endDate),
    sortOrder: String(p.sortOrder ?? 0),
    enabled: p.enabled,
  } : EMPTY_FORM;

  const handleSubmit = async (form: FormState) => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      ctaText: form.ctaText.trim() || undefined,
      ctaLink: form.ctaLink.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      sortOrder: Number(form.sortOrder) || 0,
      enabled: form.enabled,
    };
    if (editing) {
      await admin.updatePromotion(editing._id, payload);
      toast.success('Promotion updated');
    } else {
      await admin.createPromotion(payload);
      toast.success('Promotion created');
    }
    await load();
  };

  const handleToggle = async (p: Promotion) => {
    try {
      await admin.togglePromotion(p._id, !p.enabled);
      toast.success(p.enabled ? 'Promotion disabled' : 'Promotion enabled');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update promotion');
    }
  };

  const handleDelete = async (p: Promotion) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await admin.deletePromotion(p._id);
      toast.success('Promotion deleted');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete promotion');
    }
  };

  return (
    <div className="space-y-3">
      <div className="admin-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-[14px] font-extrabold text-admin-navy flex items-center gap-1.5 font-display">
            <Megaphone size={16} className="text-admin-blue" />
            Promotion Management
          </h3>
          <button onClick={openCreate} className="admin-btn-primary flex items-center gap-1.5 text-[12px] !px-3 !py-1.5">
            <Plus size={14} /> Create Promotion
          </button>
        </div>
        <p className="text-[12px] text-gray-500 mb-3.5">
          Controls the "Active Promotions" card on the customer dashboard. Only enabled promotions within their date range are shown to customers — expired or disabled ones are hidden automatically.
        </p>

        {isLoading ? (
          <SkeletonList rows={3} />
        ) : promotions.length === 0 ? (
          <EmptyState icon={Megaphone} title="No promotions yet" description="Create one to show it on the customer dashboard." tone="admin" />
        ) : (
          <div className="space-y-2">
            {promotions.map((p) => {
              const status = promotionStatus(p);
              return (
                <div key={p._id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900 text-[13px] truncate">{p.title}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0', STATUS_STYLES[status.tone])}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mb-1.5 line-clamp-2">{p.description}</p>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(p.startDate)} &ndash; {formatDate(p.endDate)}</span>
                      <span>Sort: {p.sortOrder}</span>
                      {p.ctaText && <span>CTA: "{p.ctaText}"</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(p)}
                      aria-label={p.enabled ? 'Disable promotion' : 'Enable promotion'}
                      title={p.enabled ? 'Disable' : 'Enable'}
                      className="p-1.5 text-gray-400 hover:text-admin-blue transition-colors"
                    >
                      {p.enabled ? <ToggleRight size={20} className="text-admin-blue" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => openEdit(p)} aria-label="Edit promotion" title="Edit" className="p-1.5 text-gray-400 hover:text-admin-blue transition-colors">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDelete(p)} aria-label="Delete promotion" title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PromotionFormModal
        open={modalOpen}
        initial={formFor(editing)}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
