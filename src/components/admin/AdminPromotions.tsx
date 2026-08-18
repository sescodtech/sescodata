import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, Megaphone, Loader2, X, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, adminProducts, formatDate, formatNaira, type Promotion, type AdminProduct } from '../../lib/api';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';

const CATEGORIES: { value: Promotion['category']; label: string }[] = [
  { value: 'data', label: 'Data' },
  { value: 'airtime', label: 'Airtime' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'education', label: 'Exam PIN' },
];

const NETWORKS = ['mtn', 'glo', 'airtel', '9mobile'];

type FormState = {
  category: Promotion['category'] | '';
  network: string;
  productId: string;
  promotionType: 'percentage' | 'fixed';
  discountPercent: string;
  promoPrice: string;
  startDate: string;
  endDate: string;
  sortOrder: string;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  category: '',
  network: '',
  productId: '',
  promotionType: 'percentage',
  discountPercent: '10',
  promoPrice: '',
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

/** Create/Edit modal — picks a real product from the catalog instead of free text. */
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
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    if (open) { setForm(initial); setError(''); }
  }, [open, initial]);

  // Load real products for the chosen category (+ network, for Data) from
  // ProductService via the existing admin products endpoint.
  useEffect(() => {
    if (!open || !form.category) { setProducts([]); return; }
    setIsLoadingProducts(true);
    adminProducts.list({ category: form.category })
      .then((res) => {
        const filtered = form.category === 'data' && form.network
          ? res.products.filter((p) => p.provider === form.network)
          : res.products;
        setProducts(filtered);
      })
      .catch(() => setProducts([]))
      .finally(() => setIsLoadingProducts(false));
  }, [open, form.category, form.network]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleCategoryChange = (category: Promotion['category']) => {
    setForm((f) => ({ ...f, category, network: '', productId: '' }));
  };

  const handleSubmit = async () => {
    if (!form.category) { setError('Category is required.'); return; }
    if (!form.productId) { setError('Select a product.'); return; }
    if (form.promotionType === 'percentage') {
      const pct = Number(form.discountPercent);
      if (!pct || pct <= 0 || pct >= 100) { setError('Discount percent must be between 1 and 99.'); return; }
    } else {
      const price = Number(form.promoPrice);
      if (!price || price <= 0) { setError('Promo price must be greater than 0.'); return; }
    }
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

  const isEditing = !!initial.productId;

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
              <h3 className="font-bold text-admin-navy text-[13.5px]">{isEditing ? 'Edit Promotion' : 'Create Promotion'}</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
          </div>

          <div className="p-3.5 space-y-3 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value as Promotion['category'])}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {form.category === 'data' && (
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Network *</label>
                <select
                  value={form.network}
                  onChange={(e) => setForm((f) => ({ ...f, network: e.target.value, productId: '' }))}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                >
                  <option value="">Select network…</option>
                  {NETWORKS.map((n) => <option key={n} value={n}>{n.toUpperCase()}</option>)}
                </select>
              </div>
            )}

            {form.category && (
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Product *</label>
                <select
                  value={form.productId}
                  onChange={(e) => set('productId', e.target.value)}
                  disabled={isLoadingProducts || (form.category === 'data' && !form.network)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingProducts ? 'Loading products…' : form.category === 'data' && !form.network ? 'Select a network first…' : 'Select product…'}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatNaira(p.sellingPrice)}</option>
                  ))}
                </select>
                {!isLoadingProducts && form.category && (form.category !== 'data' || form.network) && products.length === 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">No products found for this selection.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Promotion Type *</label>
                <select
                  value={form.promotionType}
                  onChange={(e) => set('promotionType', e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                >
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed price</option>
                </select>
              </div>
              {form.promotionType === 'percentage' ? (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Discount % *</label>
                  <input
                    type="number" min={1} max={99} value={form.discountPercent}
                    onChange={(e) => set('discountPercent', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Promo Price (\u20a6) *</label>
                  <input
                    type="number" min={1} value={form.promoPrice}
                    onChange={(e) => set('promoPrice', e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12.5px] outline-none focus:ring-2 focus:ring-admin-blue"
                  />
                </div>
              )}
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
              {isEditing ? 'Save Changes' : 'Create Promotion'}
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
    category: p.category,
    network: p.network || '',
    productId: p.productId,
    promotionType: p.promotionType,
    discountPercent: p.discountPercent != null ? String(p.discountPercent) : '10',
    promoPrice: p.promoPrice != null ? String(p.promoPrice) : '',
    startDate: toDateInputValue(p.startDate),
    endDate: toDateInputValue(p.endDate),
    sortOrder: String(p.sortOrder ?? 0),
    enabled: p.enabled,
  } : EMPTY_FORM;

  const handleSubmit = async (form: FormState) => {
    const payload: Partial<Promotion> = {
      productId: form.productId,
      category: form.category as Promotion['category'],
      network: form.network || undefined,
      promotionType: form.promotionType,
      discountPercent: form.promotionType === 'percentage' ? Number(form.discountPercent) : undefined,
      promoPrice: form.promotionType === 'fixed' ? Number(form.promoPrice) : undefined,
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
    if (!window.confirm(`Delete this promotion (${p.productId})? This cannot be undone.`)) return;
    try {
      await admin.deletePromotion(p._id);
      toast.success('Promotion deleted');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete promotion');
    }
  };

  const categoryLabel = (c: Promotion['category']) => CATEGORIES.find((x) => x.value === c)?.label || c;

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
          Promotions are tied to real products from the catalog. Only enabled promotions within their date range are shown to customers — expired or disabled ones are hidden automatically.
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
                      <span className="font-bold text-gray-900 text-[13px] truncate">{p.productId}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0', STATUS_STYLES[status.tone])}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mb-1.5">
                      {categoryLabel(p.category)}{p.network ? ` \u00b7 ${p.network.toUpperCase()}` : ''} \u00b7 {p.promotionType === 'percentage' ? `${p.discountPercent}% off` : `Fixed at ${formatNaira(p.promoPrice || 0)}`}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(p.startDate)} &ndash; {formatDate(p.endDate)}</span>
                      <span>Sort: {p.sortOrder}</span>
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
