import { useState, useEffect, useMemo } from 'react';
import { Smartphone, CheckCircle2, Loader2, ArrowLeft, Database, AlertCircle, RefreshCw, Wallet, Star, Clock, Search, PartyPopper, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { products as productsApi, matchesProvider, purchase, NETWORKS, detectNetworkId, formatNaira, type Product } from '../lib/api';
import { recentNumbers, favoritePlans } from '../lib/localPrefs';
import { getSupportWhatsAppUrl } from '../components/FloatingSupportButtons';
import PageHeader from '../components/PageHeader';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function BuyDataFlow() {
  useDocumentTitle('Buy Data');
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get('productId');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [manualNetworkId, setManualNetworkId] = useState<string | null>(null);
  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Product | null>(null);
  const [planFilter, setPlanFilter] = useState<'all' | 'sme' | 'gifting' | 'corporate' | 'favorites'>('all');
  const [planSearch, setPlanSearch] = useState('');

  const [allPlans, setAllPlans] = useState<Product[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [justPaid, setJustPaid] = useState(false);

  const [favorites, setFavorites] = useState<string[]>(favoritePlans.get());
  const [recents] = useState<string[]>(recentNumbers.get());

  const loadPlans = async () => {
    setIsLoadingPlans(true);
    setPlansError('');
    try {
      const res = await productsApi.list();
      setAllPlans(res.products.filter((p) => (p.category || p.cat) === 'data'));
    } catch (err: any) {
      setPlansError(err.message || 'Failed to load plans');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  useEffect(() => {
    if (allPlans.length > 0 && productIdParam) {
      const product = allPlans.find((p) => p.id === productIdParam);
      if (product) {
        const network = NETWORKS.find((n) => matchesProvider(product, n.id));
        if (network) {
          setManualNetworkId(network.id);
          setSelectedPlan(product);
        }
      }
    }
  }, [allPlans, productIdParam]);

  // Instant detection while typing — the whole point of a phone-first flow.
  const detectedNetworkId = useMemo(() => {
    const clean = phoneNumber.replace(/\s/g, '');
    return clean.length >= 4 ? detectNetworkId(clean) : null;
  }, [phoneNumber]);

  const activeNetworkId = manualNetworkId || detectedNetworkId;
  const activeNetwork = NETWORKS.find((n) => n.id === activeNetworkId) || null;

  const isValidPhone = /^(07|08|09)\d{9}$/.test(phoneNumber.replace(/\s/g, ''));

  const networkPlans = activeNetwork ? allPlans.filter((p) => matchesProvider(p, activeNetwork.id)) : [];
  const filteredPlans = (planFilter === 'all'
    ? networkPlans
    : planFilter === 'favorites'
    ? networkPlans.filter((p) => favorites.includes(p.id))
    : networkPlans.filter((p) => p.planType === planFilter)
  ).filter((p) => !planSearch.trim() || `${p.name} ${p.validity || ''}`.toLowerCase().includes(planSearch.toLowerCase()));

  const availableFilters = ['all', ...Array.from(new Set(networkPlans.map((p) => p.planType).filter(Boolean)))] as string[];

  const toggleFavorite = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    setFavorites(favoritePlans.toggle(planId));
  };

  const handlePay = async () => {
    if (!selectedPlan || !phoneNumber || !user?.email) return;
    if (user.walletBalance == null || user.walletBalance < selectedPlan.price) {
      setPaymentError('Insufficient wallet balance. Please fund your wallet first.');
      return;
    }
    setIsProcessing(true);
    setPaymentError('');
    try {
      await purchase.buyData({ productId: selectedPlan.id, recipient: phoneNumber.replace(/\s/g, ''), quantity: 1 });
      recentNumbers.add(phoneNumber);
      await refreshUser();
      setJustPaid(true);
      setTimeout(() => { window.location.href = '/app/transactions'; }, 1400);
    } catch (err: any) {
      setPaymentError(err.message || 'Purchase failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (justPaid) {
    return (
      <div className="max-w-sm mx-auto py-14">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
            <PartyPopper size={22} className="text-green-500" />
          </div>
          <h2 className="shb-page-title mb-1">Payment sent!</h2>
          <p className="shb-body">Taking you to your receipt…</p>
          <Loader2 className="animate-spin text-shb-gold-dark mx-auto mt-4" size={18} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 content-reveal px-3.5 sm:px-0">
      <PageHeader title="Buy Data" description="Instant delivery to any network." icon={Database} backTo="/app" />

      {/* Phone number — the single entry point. Network is detected live as you type. */}
      <div className="shb-card p-3.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Phone Number</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="tel"
              autoFocus
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11)); setSelectedPlan(null); }}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all font-mono text-[15px] tracking-wide"
              placeholder="08012345678"
              maxLength={11}
            />
          </div>

          {/* Network chip — auto-filled from detection, tappable to override */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setNetworkPickerOpen((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 pl-2 pr-2.5 py-2.5 rounded-lg border font-bold text-[12px] transition-colors',
                activeNetwork ? 'border-gray-200' : 'border-dashed border-gray-300 text-gray-400',
              )}
            >
              {activeNetwork ? (
                <>
                  <span className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black', activeNetwork.bg, activeNetwork.textColor)}>
                    {activeNetwork.id[0].toUpperCase()}
                  </span>
                  <span className="hidden xs:inline">{activeNetwork.name.split(' ')[0]}</span>
                </>
              ) : (
                'Network'
              )}
              <ChevronDown size={13} />
            </button>
            <AnimatePresence>
              {networkPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-lg border border-gray-100 shadow-lg z-20 p-1"
                >
                  {NETWORKS.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { setManualNetworkId(n.id); setNetworkPickerOpen(false); setSelectedPlan(null); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-left"
                    >
                      <span className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0', n.bg, n.textColor)}>
                        {n.id[0].toUpperCase()}
                      </span>
                      <span className="text-[12.5px] font-semibold text-gray-700">{n.name}</span>
                      {n.id === activeNetworkId && <CheckCircle2 size={13} className="ml-auto text-shb-gold-dark shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {phoneNumber.length > 0 && !isValidPhone && (
          <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1.5">
            <AlertCircle size={11} /> Enter a valid 11-digit Nigerian number
          </p>
        )}

        {recents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mr-0.5">
              <Clock size={10} /> Recent
            </span>
            {recents.slice(0, 4).map((num) => (
              <button
                key={num}
                onClick={() => { setPhoneNumber(num); setSelectedPlan(null); }}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border border-gray-200 text-gray-600 hover:border-shb-gold hover:text-shb-navy transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Once a network is known, plans load right below — no separate step. */}
      {activeNetwork && !selectedPlan && (
        <div className="shb-card p-3.5">
          {isLoadingPlans ? (
            <div className="flex items-center gap-2.5 text-gray-500 py-6 justify-center text-[13px]">
              <Loader2 className="animate-spin" size={16} /> Loading {activeNetwork.name} plans…
            </div>
          ) : plansError ? (
            <div className="flex items-center gap-2.5 text-red-600 bg-red-50 p-3 rounded-lg text-[12.5px]">
              <AlertCircle size={15} />
              {plansError}
              <button onClick={loadPlans} className="ml-auto text-[11px] font-bold flex items-center gap-1 hover:underline shrink-0">
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                    placeholder="Search plans (e.g. 2GB)"
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12.5px] outline-none focus:ring-2 focus:ring-shb-gold"
                  />
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-0.5 mb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPlanFilter(f as any)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 transition-all',
                      planFilter === f ? 'bg-shb-navy text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
                    )}
                  >
                    {f === 'all' ? 'All Plans' : f}
                  </button>
                ))}
                <button
                  onClick={() => setPlanFilter('favorites')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 flex items-center gap-1 transition-all',
                    planFilter === 'favorites' ? 'bg-shb-navy text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
                  )}
                >
                  <Star size={10} /> Saved
                </button>
              </div>

              {filteredPlans.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Database size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-[13px]">
                    {planSearch ? `No plans match "${planSearch}"` : planFilter === 'favorites' ? 'No saved plans yet' : `No ${planFilter !== 'all' ? planFilter : ''} plans for ${activeNetwork.name}`}
                  </p>
                  <button onClick={() => { setPlanFilter('all'); setPlanSearch(''); }} className="mt-1.5 text-[12px] text-shb-gold-dark hover:underline">Show all plans</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className="p-2.5 rounded-lg border border-gray-100 hover:border-shb-gold hover:bg-shb-gold-soft/10 transition-all text-left group relative"
                    >
                      <button
                        onClick={(e) => toggleFavorite(e, plan.id)}
                        className="icon-btn absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-white transition-colors"
                        aria-label="Toggle favorite"
                      >
                        <Star size={12} className={favorites.includes(plan.id) ? 'fill-shb-gold text-shb-gold' : 'text-gray-300'} />
                      </button>
                      <p className="font-bold text-gray-900 text-[13px] leading-tight pr-4">{plan.name}</p>
                      {plan.validity && <p className="text-[11px] text-gray-500 mt-0.5">{plan.validity}</p>}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-shb-navy font-extrabold text-[14px] whitespace-nowrap">{formatNaira(plan.price)}</span>
                        {plan.planType && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase tracking-tight">{plan.planType}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!activeNetwork && phoneNumber.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Smartphone size={26} className="mx-auto mb-2 opacity-40" />
          <p className="text-[13px] font-semibold">Type a phone number to see plans</p>
        </div>
      )}

      {/* Confirm & pay — replaces the plan grid in place, no page navigation */}
      {selectedPlan && activeNetwork && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="shb-card p-3.5">
          <button onClick={() => setSelectedPlan(null)} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-shb-navy mb-3">
            <ArrowLeft size={13} /> Change plan
          </button>

          <div className="bg-shb-gold-soft/20 border border-shb-gold-soft rounded-lg p-3 mb-3.5">
            <div className="flex justify-between items-center text-[13px] mb-1">
              <span className="text-gray-600">{selectedPlan.name} · {activeNetwork.name.split(' ')[0]}</span>
              {selectedPlan.validity && <span className="text-gray-500 text-[11px]">{selectedPlan.validity}</span>}
            </div>
            <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-shb-gold-soft">
              <span className="font-bold text-gray-900 text-[13px]">Total</span>
              <span className="text-[17px] font-extrabold text-shb-navy">{formatNaira(selectedPlan.price)}</span>
            </div>
          </div>

          <p className="text-[12.5px] text-gray-600 mb-1">Sending to <span className="font-mono font-bold text-gray-900">{phoneNumber}</span></p>

          <AnimatePresence>
            {paymentError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="my-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2 text-[12px] text-red-700"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {paymentError}
                </div>
                <a
                  href={getSupportWhatsAppUrl('my data purchase failed')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start text-[11.5px] font-bold underline hover:no-underline"
                >
                  Contact Support on WhatsApp
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="my-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2 text-[11.5px] text-gray-600">
            <Wallet size={13} className="shrink-0 mt-0.5 text-shb-gold-dark" />
            Deducted from your wallet. Data delivers automatically.
          </div>

          <button
            onClick={handlePay}
            disabled={!isValidPhone || isProcessing}
            className="shb-btn-primary w-full text-[15px] flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={17} /> Processing…</>
            ) : (
              <>Pay {formatNaira(selectedPlan.price)}</>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
