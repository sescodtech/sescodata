import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search, Download, Upload, RefreshCw, ChevronDown, Package,
  Smartphone, Database, Tv, Zap, GraduationCap, CreditCard,
  CheckCircle2, XCircle, Eye, EyeOff, Edit3, Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { adminProducts, formatNaira, type AdminProduct } from '../../lib/api';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';
import ConfirmActionDialog from './ConfirmActionDialog';

const CATEGORY_META: Record<string, { label: string; icon: any }> = {
  data: { label: 'Data', icon: Database },
  airtime: { label: 'Airtime', icon: Smartphone },
  cable: { label: 'Cable', icon: Tv },
  electricity: { label: 'Electricity', icon: Zap },
  education: { label: 'Exam PINs', icon: GraduationCap },
  recharge: { label: 'Recharge Cards', icon: CreditCard },
};

type DialogKind = 'enable' | 'disable' | 'show' | 'hide' | 'price' | 'bulkPrice' | null;

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [dialogProduct, setDialogProduct] = useState<AdminProduct | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminProducts.list({ category: categoryFilter || undefined, search: search || undefined, status: statusFilter || undefined });
      setProducts(res.products);
      setCategories(res.categories);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected([]); }, [categoryFilter, search, statusFilter]);

  const handleExport = async () => {
    try {
      await adminProducts.exportPricingCsv();
      toast.success('Pricing exported');
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reason = window.prompt('Reason for this bulk import (recorded in the audit trail):');
    if (!reason) { if (fileInputRef.current) fileInputRef.current.value = ''; return; }

    setIsImporting(true);
    try {
      const csv = await file.text();
      const res = await adminProducts.importPricing(csv, reason);
      toast.success(res.message);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Import failed');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const groupedByCategory = categoryFilter ? { [categoryFilter]: products } : products.reduce((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {} as Record<string, AdminProduct[]>);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="admin-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name, provider, or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm transition-all" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            Filters <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button onClick={load} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} <span className="hidden sm:inline">Import</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize">
                <option value="">All</option>
                {categories.map((c) => <option key={c} value={c}>{CATEGORY_META[c]?.label || c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize">
                {['', 'enabled', 'disabled', 'hidden'].map((o) => <option key={o} value={o}>{o || 'All'}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-admin-navy text-white rounded-xl">
          <span className="text-sm font-bold">{selected.length} selected</span>
          <button onClick={() => setDialog('bulkPrice')} className="px-3 py-1.5 bg-admin-blue rounded-lg text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5">
            <Edit3 size={13} /> Bulk Update Markup
          </button>
        </div>
      )}

      {/* Product list, grouped by category */}
      {isLoading ? (
        <div className="admin-card overflow-hidden"><SkeletonList rows={8} /></div>
      ) : products.length === 0 ? (
        <div className="admin-card"><EmptyState tone="admin" icon={Package} title="No products match your filters" /></div>
      ) : (
        Object.entries(groupedByCategory).map(([cat, items]) => {
          const meta = CATEGORY_META[cat] || { label: cat, icon: Package };
          const Icon = meta.icon;
          return (
            <div key={cat} className="admin-card overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                <Icon size={16} className="text-admin-blue" />
                <h3 className="font-extrabold text-admin-navy font-display">{meta.label}</h3>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-auto">{items.length} product{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[720px]">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox"
                          checked={items.every((i) => selected.includes(i.id)) && items.length > 0}
                          onChange={() => {
                            const ids = items.map((i) => i.id);
                            setSelected((s) => ids.every((id) => s.includes(id)) ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]);
                          }} className="rounded" />
                      </th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Cost</th>
                      <th className="px-4 py-3">Selling Price</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {items.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.includes(p.id)} onChange={() => setSelected((s) => s.includes(p.id) ? s.filter((id) => id !== p.id) : [...s, p.id])} className="rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900 text-xs">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{p.id}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 capitalize">{p.provider}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{p.category === 'electricity' ? '—' : formatNaira(p.costPrice)}</td>
                        <td className="px-4 py-3 font-bold text-xs text-gray-900">{p.category === 'electricity' ? 'Amount-based' : formatNaira(p.sellingPrice)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', p.enabled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                              {p.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            {!p.visible && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500">Hidden</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setDialogProduct(p); setDialog(p.enabled ? 'disable' : 'enable'); }} title={p.enabled ? 'Disable' : 'Enable'} aria-label={p.enabled ? `Disable ${p.name}` : `Enable ${p.name}`}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                              {p.enabled ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                            </button>
                            <button onClick={() => { setDialogProduct(p); setDialog(p.visible ? 'hide' : 'show'); }} title={p.visible ? 'Hide' : 'Show'} aria-label={p.visible ? `Hide ${p.name}` : `Show ${p.name}`}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                              {p.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                            {p.category !== 'electricity' && (
                              <button onClick={() => { setDialogProduct(p); setDialog('price'); }} title="Edit pricing" aria-label={`Edit pricing for ${p.name}`}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-admin-blue">
                                <Edit3 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Dialogs */}
      {dialogProduct && (
        <>
          <ConfirmActionDialog
            open={dialog === 'enable' || dialog === 'disable'} onClose={() => { setDialog(null); setDialogProduct(null); }}
            title={dialog === 'enable' ? `Enable ${dialogProduct.name}` : `Disable ${dialogProduct.name}`}
            tone={dialog === 'disable' ? 'danger' : 'default'}
            description={dialog === 'disable' ? 'Customers will no longer be able to purchase this product.' : undefined}
            confirmLabel={dialog === 'enable' ? 'Enable' : 'Disable'}
            onConfirm={async (reason) => {
              await adminProducts.toggleEnabled(dialogProduct.id, dialog === 'enable', dialogProduct.category, reason);
              toast.success(`${dialogProduct.name} ${dialog === 'enable' ? 'enabled' : 'disabled'}`);
              await load();
            }}
          />
          <ConfirmActionDialog
            open={dialog === 'show' || dialog === 'hide'} onClose={() => { setDialog(null); setDialogProduct(null); }}
            title={dialog === 'show' ? `Show ${dialogProduct.name}` : `Hide ${dialogProduct.name}`}
            description="Hidden products stay purchasable directly but won't appear in the customer catalog listing."
            confirmLabel={dialog === 'show' ? 'Show' : 'Hide'}
            onConfirm={async (reason) => {
              await adminProducts.toggleVisibility(dialogProduct.id, dialog === 'show', dialogProduct.category, reason);
              toast.success(`${dialogProduct.name} ${dialog === 'show' ? 'shown' : 'hidden'}`);
              await load();
            }}
          />
          <ConfirmActionDialog
            open={dialog === 'price'} onClose={() => { setDialog(null); setDialogProduct(null); }}
            title={`Edit Pricing — ${dialogProduct.name}`}
            description={`Cost price: ${formatNaira(dialogProduct.costPrice)}. Set either a fixed selling price or a custom markup %.`}
            confirmLabel="Save Pricing"
            extraFields={[
              { key: 'customSellingPrice', label: 'Custom Selling Price (₦, optional)', type: 'number', placeholder: String(dialogProduct.sellingPrice) },
              { key: 'customMarkupPct', label: 'Custom Markup % (optional, ignored if price is set)', type: 'number', placeholder: 'e.g. 12' },
            ]}
            onConfirm={async (reason, extra) => {
              await adminProducts.setCustomPricing(
                dialogProduct.id, dialogProduct.category, reason,
                extra.customSellingPrice ? Number(extra.customSellingPrice) : undefined,
                extra.customMarkupPct ? Number(extra.customMarkupPct) : undefined,
              );
              toast.success('Pricing updated');
              await load();
            }}
          />
        </>
      )}

      <ConfirmActionDialog
        open={dialog === 'bulkPrice'} onClose={() => setDialog(null)}
        title={`Bulk Update Markup — ${selected.length} product(s)`}
        confirmLabel="Apply"
        extraFields={[{ key: 'customMarkupPct', label: 'Markup %', type: 'number', placeholder: 'e.g. 10', required: true }]}
        onConfirm={async (reason, extra) => {
          if (!extra.customMarkupPct) throw new Error('Markup % is required');
          const res = await adminProducts.bulkUpdatePricing(selected, Number(extra.customMarkupPct), reason);
          toast.success(res.message);
          setSelected([]);
          await load();
        }}
      />
    </div>
  );
}
