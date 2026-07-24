import { useState, useEffect } from 'react';
import {
  Users, LayoutDashboard, DollarSign, Building2,
  Smartphone, Tv, Wallet, Receipt, Sparkles, RotateCcw,
  Database, GraduationCap, CreditCard, Zap, Package, Palette, Check, Radio, ScrollText, BarChart3, Headset,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { admin, settings } from '../lib/api';
import { applyBrandColor } from '../lib/theme';
import { toast } from 'sonner';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminWallet from '../components/admin/AdminWallet';
import AdminTransactions from '../components/admin/AdminTransactions';
import AdminOperations from '../components/admin/AdminOperations';
import AdminProducts from '../components/admin/AdminProducts';
import AdminProviders from '../components/admin/AdminProviders';
import AdminReports from '../components/admin/AdminReports';
import AdminSupport from '../components/admin/AdminSupport';
import AdminAuditLogs from '../components/admin/AdminAuditLogs';

const TABS = [
  { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
  { id: 'USERS', label: 'Users', icon: Users },
  { id: 'WALLET', label: 'Wallet', icon: Wallet },
  { id: 'TRANSACTIONS', label: 'Transactions', icon: Receipt },
  { id: 'OPERATIONS', label: 'Operations', icon: RotateCcw },
  { id: 'PRICING', label: 'Pricing', icon: DollarSign },
  { id: 'PROVIDERS', label: 'Providers', icon: Radio },
  { id: 'REPORTS', label: 'Reports', icon: BarChart3 },
  { id: 'SUPPORT', label: 'Support', icon: Headset },
  { id: 'AUDIT', label: 'Audit Logs', icon: ScrollText },
  { id: 'BRANDING', label: 'Branding', icon: Palette },
] as const;

type Tab = (typeof TABS)[number]['id'];

export default function AdminDashboardPage() {
  useDocumentTitle('Business Control Center');
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [markup, setMarkup] = useState<Record<string, number>>({});
  const [brandColor, setBrandColor] = useState('#2563EB');
  const [savedBrandColor, setSavedBrandColor] = useState('#2563EB');
  const [savingBrand, setSavingBrand] = useState(false);

  useEffect(() => {
    fetchMarkup();
    fetchBranding();
  }, []);

  async function fetchBranding() {
    try {
      const res = await settings.getBranding();
      if (res.primaryColor) {
        setBrandColor(res.primaryColor);
        setSavedBrandColor(res.primaryColor);
      }
    } catch {
      // Non-critical — leave the default and let the admin set one.
    }
  }

  async function handleSaveBranding() {
    setSavingBrand(true);
    try {
      await admin.setBranding(brandColor);
      applyBrandColor(brandColor); // reflect instantly in this session too
      setSavedBrandColor(brandColor);
      toast.success('Brand color updated — live across the site now');
    } catch (e: any) {
      toast.error(`Couldn't save brand color: ${e.message}`);
    } finally {
      setSavingBrand(false);
    }
  }

  async function fetchMarkup() {
    const data = await admin.getMarkup();
    setMarkup(data.markup || {});
  }

  async function handleUpdateMarkup(category: string, value: number) {
    try {
      const newMarkup = { ...markup, [category]: value };
      await admin.setMarkup(newMarkup);
      setMarkup(newMarkup);
      toast.success(`Updated ${category} markup`);
    } catch (e: any) {
      toast.error(`Markup update failed: ${e.message}`);
    }
  }

  return (
    <div className="admin-shell -m-4 md:-m-8 p-4 md:p-8 min-h-[calc(100vh-4rem)]" style={{ background: 'var(--color-admin-bg)' }}>
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-admin-blue to-admin-blue-dark" style={{ boxShadow: 'var(--shadow-admin-blue)' }}>
              <Building2 size={22} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-admin-navy tracking-tight font-display">Business Control Center</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-admin-gold-soft text-admin-gold">
                  <Sparkles size={9} /> SescoHub
                </span>
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Operations Console</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div role="tablist" aria-label="Business Control Center sections" className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  activeTab === tab.id ? 'bg-admin-blue text-white shadow-md' : 'text-gray-500 hover:text-admin-navy hover:bg-gray-50',
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'OVERVIEW' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminOverview />
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminUsers />
          </div>
        )}

        {activeTab === 'WALLET' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminWallet />
          </div>
        )}

        {activeTab === 'TRANSACTIONS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminTransactions />
          </div>
        )}

        {activeTab === 'OPERATIONS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminOperations />
          </div>
        )}

        {activeTab === 'PRICING' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="admin-card p-6 sm:p-8">
              <h3 className="text-lg font-bold text-admin-navy mb-1 flex items-center gap-2 font-display">
                <DollarSign size={20} className="text-admin-blue" />
                Global Category Markup
              </h3>
              <p className="text-sm text-gray-500 mb-8">
                Baseline profit percentage applied to every product in a category. Individual products can override this — see Product Management below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'data', label: 'Data Bundles', icon: Database },
                  { id: 'airtime', label: 'Airtime Top-up', icon: Smartphone },
                  { id: 'cable', label: 'Cable TV', icon: Tv },
                  { id: 'education', label: 'Exam PINs', icon: GraduationCap },
                  { id: 'recharge', label: 'Recharge Cards', icon: CreditCard },
                  { id: 'bills', label: 'Electricity / Bills', icon: Zap },
                ].map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-admin-blue/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                        <p.icon size={18} />
                      </div>
                      <span className="font-bold text-gray-800 text-sm">{p.label}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={markup[p.id] ?? ''}
                        onChange={(e) => handleUpdateMarkup(p.id, parseFloat(e.target.value))}
                        className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-center outline-none focus:ring-2 focus:ring-admin-blue transition-all"
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-6">
                Changes save automatically as you type and apply to every purchase immediately — no separate "Apply" step.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-admin-navy mb-1 flex items-center gap-2 font-display">
                <Package size={20} className="text-admin-blue" />
                Product Management
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Enable/disable, hide, and override pricing for individual products — Airtime, Data, Cable, Electricity, and Exam PINs.
              </p>
              <AdminProducts />
            </div>
          </div>
        )}

        {activeTab === 'PROVIDERS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminProviders />
          </div>
        )}

        {activeTab === 'REPORTS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminReports />
          </div>
        )}

        {activeTab === 'SUPPORT' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminSupport />
          </div>
        )}

        {activeTab === 'AUDIT' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminAuditLogs />
          </div>
        )}

        {activeTab === 'BRANDING' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="admin-card p-6 sm:p-8 max-w-2xl">
              <h3 className="text-lg font-bold text-admin-navy mb-1 flex items-center gap-2 font-display">
                <Palette size={20} className="text-admin-blue" />
                Brand Color
              </h3>
              <p className="text-sm text-gray-500 mb-8">
                Sets the primary color used across the customer-facing app — buttons, links, active states, and highlights. Hover shades and soft backgrounds are generated automatically from this one color.
              </p>

              <div className="flex items-center gap-4 mb-6">
                <label className="relative w-16 h-16 rounded-2xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer shrink-0">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="absolute inset-0 w-[150%] h-[150%] -translate-x-[8px] -translate-y-[8px] cursor-pointer border-none p-0"
                    aria-label="Pick brand color"
                  />
                </label>
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Hex value</label>
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => {
                      const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                      setBrandColor(v);
                    }}
                    placeholder="#2563EB"
                    maxLength={7}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-admin-blue transition-all uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">Preview</span>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm"
                  style={{ background: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#2563EB' }}
                >
                  Buy Data
                </button>
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    color: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#2563EB',
                    background: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? `${brandColor}1A` : '#2563EB1A',
                  }}
                >
                  Active tab
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveBranding}
                  disabled={savingBrand || !/^#[0-9A-Fa-f]{6}$/.test(brandColor)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-admin-blue text-white text-sm font-bold shadow-md hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Check size={16} />
                  {savingBrand ? 'Saving…' : 'Save & apply site-wide'}
                </button>
                {brandColor === savedBrandColor && (
                  <span className="text-xs font-semibold text-gray-400">Currently live</span>
                )}
              </div>
              {!/^#[0-9A-Fa-f]{6}$/.test(brandColor) && (
                <p className="text-xs font-semibold text-red-500 mt-3">Enter a valid 6-digit hex color, e.g. #2563EB</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
