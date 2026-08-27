import { useState, useEffect } from 'react';
import {
  Users, LayoutDashboard, DollarSign, Building2,
  Smartphone, Tv, Wallet, Receipt, Sparkles, RotateCcw,
  Database, GraduationCap, CreditCard, Zap, Package, Palette, Check, Radio, ScrollText, BarChart3, Headset, ChevronDown, Megaphone, MessageCircle, ShieldCheck,
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
import AdminPromotions from '../components/admin/AdminPromotions';
import AdminKyc from '../components/admin/AdminKyc';

const TABS = [
  { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
  { id: 'USERS', label: 'Users', icon: Users },
  { id: 'KYC', label: 'KYC', icon: ShieldCheck },
  { id: 'WALLET', label: 'Wallet', icon: Wallet },
  { id: 'TRANSACTIONS', label: 'Transactions', icon: Receipt },
  { id: 'OPERATIONS', label: 'Operations', icon: RotateCcw },
  { id: 'PRICING', label: 'Pricing', icon: DollarSign },
  { id: 'PROVIDERS', label: 'Providers', icon: Radio },
  { id: 'PROMOTIONS', label: 'Promotions', icon: Megaphone },
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
  const [supportEmail, setSupportEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savedSupportSettings, setSavedSupportSettings] = useState({ supportEmail: '', whatsappNumber: '' });
  const [savingSupport, setSavingSupport] = useState(false);

  useEffect(() => {
    fetchMarkup();
    fetchBranding();
    fetchSupportSettings();
  }, []);

  async function fetchSupportSettings() {
    try {
      const res = await settings.getSupport();
      setSupportEmail(res.supportEmail);
      setWhatsappNumber(res.whatsappNumber);
      setSavedSupportSettings({ supportEmail: res.supportEmail, whatsappNumber: res.whatsappNumber });
    } catch {
      // Non-critical — defaults already cover the customer-facing side.
    }
  }

  async function handleSaveSupportSettings() {
    setSavingSupport(true);
    try {
      const res = await admin.setSupportSettings(supportEmail, whatsappNumber);
      setSupportEmail(res.supportEmail);
      setWhatsappNumber(res.whatsappNumber);
      setSavedSupportSettings({ supportEmail: res.supportEmail, whatsappNumber: res.whatsappNumber });
      toast.success('Support contact details updated — live across the site now');
    } catch (e: any) {
      toast.error(`Couldn't save support settings: ${e.message}`);
    } finally {
      setSavingSupport(false);
    }
  }

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

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="admin-shell -m-3.5 md:-m-6 min-h-[calc(100vh-4rem)]" style={{ background: 'var(--color-admin-bg)' }}>
      {/* Sticky console header — identity row + section switcher both stick, so the
          active section is always reachable with one hand, no horizontal scroll. */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-3 md:px-5 pt-2.5 pb-2 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-md shrink-0 bg-gradient-to-br from-admin-blue to-admin-blue-dark" style={{ boxShadow: 'var(--shadow-admin-blue)' }}>
              <Building2 size={15} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[13px] font-extrabold text-admin-navy tracking-tight font-display truncate">Business Control Center</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest bg-admin-gold-soft text-admin-gold shrink-0">
                  <Sparkles size={8} /> SescoHub
                </span>
              </div>
              <p className="text-gray-400 text-[9.5px] font-bold uppercase tracking-widest">Operations Console</p>
            </div>
          </div>
        </div>

        {/* Mobile: a single compact section picker (native select) — never overflows,
            never scrolls, always shows the full list without truncated tab labels. */}
        <div className="md:hidden px-3 pb-2.5">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-admin-blue pointer-events-none">
              <activeTabMeta.icon size={14} />
            </span>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as Tab)}
              aria-label="Business Control Center section"
              className="w-full appearance-none pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12.5px] font-bold text-admin-navy outline-none focus:border-transparent focus:ring-2 focus:ring-admin-blue"
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Desktop/tablet: full section switcher that wraps onto extra rows instead
            of scrolling horizontally — every section stays one tap away. */}
        <div className="hidden md:block px-5 pb-2.5">
          <div role="tablist" aria-label="Business Control Center sections" className="flex flex-wrap gap-1 bg-gray-50/80 p-1 rounded-lg border border-gray-100 max-w-[1600px] mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap',
                  activeTab === tab.id ? 'bg-admin-blue text-white shadow-sm' : 'text-gray-500 hover:text-admin-navy hover:bg-white',
                )}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-500 pb-8 pt-3 px-3 md:px-5 max-w-[1600px] mx-auto">

        {activeTab === 'OVERVIEW' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminOverview onNavigateTab={(tab) => setActiveTab(tab)} />
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminUsers />
          </div>
        )}

        {activeTab === 'KYC' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminKyc />
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
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <div className="admin-card p-3 sm:p-4">
              <h3 className="text-[14px] font-extrabold text-admin-navy mb-0.5 flex items-center gap-1.5 font-display">
                <DollarSign size={16} className="text-admin-blue" />
                Global Category Markup
              </h3>
              <p className="text-[12px] text-gray-500 mb-3.5">
                Baseline profit percentage applied to every product in a category. Individual products can override this — see Product Management below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {[
                  { id: 'data', label: 'Data Bundles', icon: Database },
                  { id: 'airtime', label: 'Airtime Top-up', icon: Smartphone },
                  { id: 'cable', label: 'Cable TV', icon: Tv },
                  { id: 'education', label: 'Exam PINs', icon: GraduationCap },
                  { id: 'recharge', label: 'Recharge Cards', icon: CreditCard },
                  { id: 'bills', label: 'Electricity / Bills', icon: Zap },
                ].map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 group hover:border-admin-blue/30 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm shrink-0">
                        <p.icon size={15} />
                      </div>
                      <span className="font-bold text-gray-800 text-[12.5px] truncate">{p.label}</span>
                    </div>
                    <div className="relative shrink-0">
                      <input
                        type="number"
                        value={markup[p.id] ?? ''}
                        onChange={(e) => handleUpdateMarkup(p.id, parseFloat(e.target.value))}
                        className="w-16 pl-2.5 pr-5 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-black text-center outline-none focus:ring-2 focus:ring-admin-blue transition-all"
                        placeholder="0"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] text-gray-400 mt-3">
                Changes save automatically as you type and apply to every purchase immediately — no separate "Apply" step.
              </p>
            </div>

            <div>
              <h3 className="text-[14px] font-extrabold text-admin-navy mb-0.5 flex items-center gap-1.5 font-display">
                <Package size={16} className="text-admin-blue" />
                Product Management
              </h3>
              <p className="text-[12px] text-gray-500 mb-2.5">
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

        {activeTab === 'PROMOTIONS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminPromotions />
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
            <div className="admin-card p-3 sm:p-4 max-w-xl">
              <h3 className="text-[14px] font-extrabold text-admin-navy mb-0.5 flex items-center gap-1.5 font-display">
                <Palette size={16} className="text-admin-blue" />
                Brand Color
              </h3>
              <p className="text-[12px] text-gray-500 mb-3.5">
                Sets the primary color used across the customer-facing app — buttons, links, active states, and highlights. Hover shades and soft backgrounds are generated automatically from this one color.
              </p>

              <div className="flex items-center gap-3 mb-3">
                <label className="relative w-10 h-10 rounded-lg border border-gray-200 shadow-sm overflow-hidden cursor-pointer shrink-0">
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
                    className="admin-input uppercase font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mb-3.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">Preview</span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white shadow-sm"
                  style={{ background: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#2563EB' }}
                >
                  Buy Data
                </button>
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{
                    color: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#2563EB',
                    background: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? `${brandColor}1A` : '#2563EB1A',
                  }}
                >
                  Active tab
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleSaveBranding}
                  disabled={savingBrand || !/^#[0-9A-Fa-f]{6}$/.test(brandColor)}
                  className="admin-btn-primary flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {savingBrand ? 'Saving…' : 'Save & apply site-wide'}
                </button>
                {brandColor === savedBrandColor && (
                  <span className="text-[11px] font-semibold text-gray-400">Currently live</span>
                )}
              </div>
              {!/^#[0-9A-Fa-f]{6}$/.test(brandColor) && (
                <p className="text-[11px] font-semibold text-red-500 mt-2.5">Enter a valid 6-digit hex color, e.g. #2563EB</p>
              )}
            </div>

            <div className="admin-card p-3 sm:p-4 max-w-xl mt-3">
              <h3 className="text-[14px] font-extrabold text-admin-navy flex items-center gap-1.5 font-display mb-0.5">
                <MessageCircle size={16} className="text-admin-blue" />
                Support Contact Settings
              </h3>
              <p className="text-[12px] text-gray-500 mb-3.5">
                Used by the floating WhatsApp button, the Support and Contact pages, the footer, and receipts across the whole site. Update once here — every customer-facing page picks it up automatically.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@sescohub.com"
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">WhatsApp Number</label>
                  <input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="08140112803"
                    className="admin-input"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
                <button
                  onClick={handleSaveSupportSettings}
                  disabled={savingSupport || !supportEmail.trim() || !whatsappNumber.trim()}
                  className="admin-btn-primary flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {savingSupport ? 'Saving…' : 'Save Support Settings'}
                </button>
                {supportEmail === savedSupportSettings.supportEmail && whatsappNumber === savedSupportSettings.whatsappNumber && (
                  <span className="text-[11px] font-semibold text-gray-400">Currently live</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
