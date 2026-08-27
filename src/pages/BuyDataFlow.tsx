import { useState, useEffect, useMemo } from 'react';
import { Smartphone, CheckCircle2, Loader2, Database, AlertCircle, RefreshCw, Wallet, Star, Clock, Search, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSupportSettings } from '../context/SupportSettingsContext';
import { products as productsApi, matchesProvider, purchase, NETWORKS, detectNetworkId, formatNaira, type Product } from '../lib/api';
import { recentNumbers, favoritePlans } from '../lib/localPrefs';
import PageHeader from '../components/PageHeader';
import { useDocumentTitle } from '../lib/useDocumentTitle';

// UI-only redesign (OPay-style single page). All state, validation, network
// detection, productId preload, and the purchase call below are unchanged
// from before — only the JSX layout/styling was restructured.
export default function BuyDataFlow() {
  useDocumentTitle('Buy Data');
  const { user, refreshUser } = useAuth();
  const { getWhatsAppUrl } = useSupportSettings();
  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get('productId');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [manualNetworkId, setManualNetworkId] = useState<string | null>(null);
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

  const insufficientBalance = !!selectedPlan && user?.walletBalance != null && user.walletBalance < selectedPlan.price;

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
      <div className="shb-page shb-page--narrow py-10">
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
    <div className="shb-page shb-page--narrow space-y-2 sm:space-y-2.5 content-reveal pb-36 sm:pb-3 overflow-x-hidden">
      <PageHeader title="Buy Data" description="Instant delivery to any network." icon={Database} backTo="/app" />

      {/* Wallet Balance — always visible at the top, OPay-style */}
      <div className="shb-card p-2 sm:p-2.5 flex items-center justify-between bg-shb-navy text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Wallet size={16} />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/60">Wallet Balance</p>
            <p className="text-[15px] sm:text-[16px] font-extrabold leading-tight">{formatNaira(user?.walletBalance || 0)}</p>
          </div>
        </div>
      </div>

      {/* Phone Number */}
      <div className="shb-card p-2.5 sm:p-3">
        <label className="text-[10px] sm:text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Phone Number</label>
        <div className="relative">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="tel"
            autoFocus
            value={phoneNumber}
            onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11)); setSelectedPlan(null); }}
            className="w-full pl-9 pr-3 py-2.25 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all font-mono text-[13px] sm:text-[14px] tracking-wide"
            placeholder="08012345678"
            maxLength={11}
          />
        </div>

        {phoneNumber.length > 0 && !isValidPhone && (
          <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1.5">
            <AlertCircle size={11} /> Enter a valid 11-digit Nigerian number
          </p>
        )}

        {recents.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-50">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-0.5">
              <Clock size={10} /> Recent
            </span>
            {recents.slice(0, 4).map((num) => (
              <button
                key={num}
                onClick={() => { setPhoneNumber(num); setSelectedPlan(null); }}
                className="px-2 py-1 rounded-md text-[10px] font-mono font-bold border border-gray-200 text-gray-600 hover:border-shb-gold hover:text-shb-navy transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Network — always visible as its own row of tappable options, auto-filled from the phone number but overridable */}
      <div className="shb-card p-2.5 sm:p-3">
        <label className="text-[10px] sm:text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Network</label>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => { setManualNetworkId(n.id); setSelectedPlan(null); }}
              className={cn(
                'flex min-w-0 w-full flex-col items-center justify-center gap-0.5 sm:gap-1 py-1.75 sm:py-2.5 rounded-lg border-2 transition-all',
                activeNetworkId === n.id ? 'border-shb-gold bg-shb-gold-soft/20' : 'border-gray-100 hover:border-gray-200',
              )}
            >
              <span className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-black', n.bg, n.textColor)}>
                {n.id[0].toUpperCase()}
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-bold text-gray-700 truncate w-full text-center px-0.5">{n.name.split(' ')[0]}</span>
              {activeNetworkId === n.id && <CheckCircle2 size={11} className="text-shb-gold-dark" />}
            </button>
          ))}
        </div>
      </div>

      {/* Data Plan — grid stays visible; the chosen plan is highlighted rather than replacing the section */}
      {activeNetwork && (
        <div className="shb-card p-2.5 sm:p-3">
          <label className="text-[10px] sm:text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Data Plan</label>

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
              <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                    placeholder="Search plans (e.g. 2GB)"
                    className="w-full pl-8 pr-3 py-1.75 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11.5px] sm:text-[12px] outline-none focus:ring-2 focus:ring-shb-gold"
                  />
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto overflow-y-hidden pb-0.5 mb-2 sm:mb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPlanFilter(f as any)}
                    className={cn(
                      'shb-chip px-2 py-1 rounded-md text-[9px] sm:text-[9.5px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 transition-all',
                      planFilter === f ? 'bg-shb-navy text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
                    )}
                  >
                    {f === 'all' ? 'All Plans' : f}
                  </button>
                ))}
                <button
                  onClick={() => setPlanFilter('favorites')}
                  className={cn(
                    'shb-chip px-2 py-1 rounded-md text-[9px] sm:text-[9.5px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 flex items-center gap-1 transition-all',
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
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 max-h-[58vh] sm:max-h-[460px] overflow-y-auto overflow-x-hidden pr-0.5">
                  {filteredPlans.map((plan) => (
                    <div key={plan.id} className={cn(
                      'relative min-w-0 rounded-lg border-2 transition-all overflow-hidden',
                      selectedPlan?.id === plan.id ? 'border-shb-gold bg-shb-gold-soft/20' : 'border-gray-100 hover:border-shb-gold hover:bg-shb-gold-soft/10',
                    )}>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className="w-full min-w-0 text-left p-2 sm:p-2.5 pr-7 focus:outline-none"
                      >
                        {selectedPlan?.id === plan.id && (
                          <CheckCircle2 size={10} className="absolute top-1.5 left-1.5 text-shb-gold-dark" />
                        )}
                        <p className={cn(
                          'font-bold text-gray-900 text-[10.5px] min-[390px]:text-[11px] sm:text-[12px] leading-tight break-words line-clamp-2',
                          selectedPlan?.id === plan.id && 'pl-3'
                        )}>{plan.name}</p>
                        {plan.validity && <p className="text-[8.5px] min-[390px]:text-[9px] sm:text-[10px] text-gray-500 mt-0.5 leading-tight line-clamp-2">{plan.validity}</p>}
                        <div className="flex items-end justify-between gap-1 mt-1">
                          <span className="text-shb-navy font-extrabold text-[11px] min-[390px]:text-[11.5px] sm:text-[13px] whitespace-nowrap">{formatNaira(plan.price)}</span>
                          {plan.planType && (
                            <span className="max-w-[62%] px-1 py-0.5 bg-gray-100 text-gray-500 rounded text-[6.5px] min-[390px]:text-[7px] sm:text-[8px] font-bold uppercase leading-tight text-right break-words">
                              {plan.planType}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, plan.id)}
                        className="absolute top-1 right-1 p-1 rounded-full hover:bg-white transition-colors"
                        aria-label="Toggle favorite"
                      >
                        <Star size={10} className={favorites.includes(plan.id) ? 'fill-shb-gold text-shb-gold' : 'text-gray-300'} />
                      </button>
                    </div>
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
          <p className="text-[13px] font-semibold">Type a phone number or pick a network to see plans</p>
        </div>
      )}

      <AnimatePresence>
        {paymentError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="shb-card p-2.5 border-red-200 bg-red-50 flex flex-col gap-2 text-[12px] text-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {paymentError}
            </div>
            <a
              href={getWhatsAppUrl('my data purchase failed')}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-[11.5px] font-bold underline hover:no-underline"
            >
              Contact Support on WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Amount + Buy — sticky summary bar, OPay-style, always at the bottom of the flow */}
      <div className="sm:relative fixed sm:static bottom-0 left-0 right-0 sm:mt-0 bg-white sm:bg-transparent border-t sm:border-t-0 border-gray-100 sm:shadow-none shadow-[0_-4px_16px_rgba(0,0,0,0.06)] p-2.5 sm:p-0 z-30" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto shb-card p-3 sm:p-3.5 sm:!shadow-none sm:!border sm:border-gray-100">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Amount</span>
            <span className="text-[17px] font-extrabold text-shb-navy">{selectedPlan ? formatNaira(selectedPlan.price) : '\u2014'}</span>
          </div>
          {selectedPlan && (
            <p className="text-[11.5px] text-gray-500 mb-1.5 sm:mb-2.5 break-words">
              {selectedPlan.name}{selectedPlan.validity ? ` \u00b7 ${selectedPlan.validity}` : ''} to <span className="font-mono font-bold text-gray-800">{phoneNumber || '\u2014'}</span>
            </p>
          )}
          {insufficientBalance && (
            <p className="text-[11.5px] text-red-600 font-semibold flex items-center gap-1 mb-1.5 sm:mb-2">
              <AlertCircle size={12} /> Insufficient wallet balance
            </p>
          )}
          <button
            onClick={handlePay}
            disabled={!selectedPlan || !isValidPhone || isProcessing}
            className="shb-btn-primary w-full text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={17} /> Processing…</>
            ) : (
              <>Buy {selectedPlan ? formatNaira(selectedPlan.price) : 'Data'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
