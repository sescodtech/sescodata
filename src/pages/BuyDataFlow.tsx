import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, ChevronRight, Loader2, ArrowLeft, Database, AlertCircle, RefreshCw, Wallet, Star, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { products as productsApi, matchesProvider, purchase, NETWORKS, formatNaira, type Product } from '../lib/api';
import { recentNumbers, favoritePlans } from '../lib/localPrefs';
import PageHeader from '../components/PageHeader';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const STEPS = ['Select Network', 'Choose Plan', 'Confirm & Pay'];

export default function BuyDataFlow() {
  useDocumentTitle('Buy Data');
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get('productId');

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedNetwork, setSelectedNetwork] = useState<typeof NETWORKS[number] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Product | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'sme' | 'gifting' | 'corporate' | 'favorites'>('all');

  // API state
  const [allPlans, setAllPlans] = useState<Product[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Convenience state (client-side only, non-breaking)
  const [favorites, setFavorites] = useState<string[]>(favoritePlans.get());
  const [recents] = useState<string[]>(recentNumbers.get());

  // Load all data plans on mount
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

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (allPlans.length > 0 && productIdParam) {
      const product = allPlans.find(p => p.id === productIdParam);
      if (product) {
        const network = NETWORKS.find(n => matchesProvider(product, n.id));
        if (network) {
          setSelectedNetwork(network);
          setSelectedPlan(product);
          setCurrentStep(2);
        }
      }
    }
  }, [allPlans, productIdParam]);

  // Plans for the selected network
  const networkPlans = selectedNetwork
    ? allPlans.filter((p) => matchesProvider(p, selectedNetwork.id))
    : [];

  const filteredPlans = planFilter === 'all'
    ? networkPlans
    : planFilter === 'favorites'
    ? networkPlans.filter((p) => favorites.includes(p.id))
    : networkPlans.filter((p) => p.planType === planFilter);

  const availableFilters = ['all', ...Array.from(new Set(networkPlans.map((p) => p.planType).filter(Boolean)))] as string[];

  // Phone validation
  const isValidPhone = /^(07|08|09)\d{9}$/.test(phoneNumber.replace(/\s/g, ''));

  const handleNetworkSelect = (network: typeof NETWORKS[number]) => {
    setSelectedNetwork(network);
    setSelectedPlan(null);
    setPlanFilter('all');
    setCurrentStep(1);
  };

  const handlePlanSelect = (plan: Product) => {
    setSelectedPlan(plan);
    setCurrentStep(2);
  };

  const toggleFavorite = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    setFavorites(favoritePlans.toggle(planId));
  };

  const handlePay = async () => {
    if (!selectedPlan || !phoneNumber || !user?.email) return;

    // Check wallet balance
    if (user.walletBalance == null || user.walletBalance < selectedPlan.price) {
      setPaymentError('Insufficient wallet balance. Please fund your wallet first.');
      return;
    }

    setIsProcessing(true);
    setPaymentError('');
    try {
      await purchase.buyData({
        productId: selectedPlan.id,
        recipient: phoneNumber.replace(/\s/g, ''),
        quantity: 1,
      });

      recentNumbers.add(phoneNumber);

      // Refresh user balance and redirect to transactions
      await refreshUser();
      window.location.href = '/app/transactions';
    } catch (err: any) {
      setPaymentError(err.message || 'Purchase failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setSelectedNetwork(null);
    setSelectedPlan(null);
    setPhoneNumber('');
    setPlanFilter('all');
    setPaymentError('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 content-reveal px-4 sm:px-0">
      <PageHeader
        title="Buy Mobile Data"
        description="Cheap data plans for all networks."
        icon={Database}
        backTo="/app"
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 px-2 sm:px-4">
        {STEPS.map((step, idx) => (
          <div key={step} className="flex flex-col items-center relative flex-1 max-w-[80px] sm:max-w-none">
            <div className={cn(
              'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all relative z-10',
              idx < currentStep ? 'bg-green-600 text-white' :
              idx === currentStep ? 'bg-shb-navy text-white ring-2 sm:ring-4 ring-shb-gold-soft/60' :
              'bg-gray-200 text-gray-500'
            )}>
              {idx < currentStep ? <CheckCircle2 size={16} /> : idx + 1}
            </div>
            <span className={cn(
              'mt-1 sm:mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-center leading-tight',
              idx === currentStep ? 'text-shb-navy' : 'text-gray-400'
            )}>{step}</span>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                'absolute top-4 sm:top-5 left-1/2 w-full h-[2px] -z-0',
                idx < currentStep ? 'bg-green-600' : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="shb-card p-4 sm:p-6 md:p-10 relative overflow-hidden">
        <AnimatePresence mode="wait">

          {/* STEP 0: Network Selection */}
          {currentStep === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2 font-display">Select Network</h2>
              <p className="text-sm text-gray-500 mb-6 sm:mb-8">Which network do you want to buy data for?</p>

              {isLoadingPlans && (
                <div className="flex items-center gap-3 text-gray-500 py-6 sm:py-8">
                  <Loader2 className="animate-spin" size={20} /> Loading plans from providers...
                </div>
              )}
              {plansError && (
                <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl mb-6">
                  <AlertCircle size={18} />
                  <span className="text-sm">{plansError}</span>
                  <button onClick={loadPlans} className="ml-auto text-xs font-bold flex items-center gap-1 hover:underline touch-manipulation">
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {NETWORKS.map((net) => {
                  const count = allPlans.filter((p) => matchesProvider(p, net.id)).length;
                  return (
                    <button
                      key={net.id}
                      onClick={() => handleNetworkSelect(net)}
                      disabled={isLoadingPlans}
                      className="p-4 sm:p-6 rounded-2xl border-2 border-gray-100 hover:border-shb-gold transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      <div className={cn('w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black mb-3 sm:mb-4 transition-transform group-hover:scale-110', net.bg, net.textColor)}>
                        {net.id[0].toUpperCase()}
                      </div>
                      <p className="font-bold text-gray-900 text-sm sm:text-base">{net.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {isLoadingPlans ? 'Loading...' : count > 0 ? `${count} plans available` : 'No plans loaded'}
                      </p>
                      <ChevronRight size={16} className="mt-2 sm:mt-3 text-gray-300 group-hover:text-shb-gold-dark transition-colors" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 1: Plan Selection */}
          {currentStep === 1 && selectedNetwork && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <button onClick={() => setCurrentStep(0)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors touch-manipulation">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 font-display">Choose a Plan</h2>
                  <p className="text-sm text-gray-500">{selectedNetwork.name}</p>
                </div>
                <div className={cn('ml-auto w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm sm:text-lg', selectedNetwork.bg, selectedNetwork.textColor)}>
                  {selectedNetwork.id[0].toUpperCase()}
                </div>
              </div>

              {/* Plan type filter tabs */}
              <div className="flex gap-2 p-1 bg-gray-50 rounded-xl mb-6 overflow-x-auto">
                {favorites.length > 0 && (
                  <button
                    onClick={() => setPlanFilter('favorites')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1',
                      planFilter === 'favorites' ? 'bg-white text-shb-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <Star size={11} className={planFilter === 'favorites' ? 'fill-shb-gold text-shb-gold' : ''} /> Favorites
                  </button>
                )}
                {availableFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPlanFilter(f as any)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all',
                      planFilter === f ? 'bg-white text-shb-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {f === 'all' ? 'All Plans' : f.toUpperCase()}
                  </button>
                ))}
              </div>

              {filteredPlans.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Database size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-semibold">
                    {planFilter === 'favorites' ? 'No favorite plans yet' : `No ${planFilter !== 'all' ? planFilter : ''} plans for ${selectedNetwork.name}`}
                  </p>
                  <button onClick={() => setPlanFilter('all')} className="mt-2 text-sm text-shb-gold-dark hover:underline">Show all plans</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanSelect(plan)}
                      className="p-5 rounded-2xl border-2 border-gray-100 hover:border-shb-gold hover:bg-shb-gold-soft/10 transition-all text-left group relative"
                    >
                      <button
                        onClick={(e) => toggleFavorite(e, plan.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white transition-colors"
                        aria-label="Toggle favorite"
                      >
                        <Star size={15} className={favorites.includes(plan.id) ? 'fill-shb-gold text-shb-gold' : 'text-gray-300'} />
                      </button>
                      <div className="flex justify-between items-start pr-6">
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{plan.name}</p>
                          {plan.validity && <p className="text-xs text-gray-500 mt-0.5">{plan.validity}</p>}
                          {plan.planType && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase tracking-tight">
                              {plan.planType}
                            </span>
                          )}
                        </div>
                        <span className="text-shb-navy font-extrabold text-lg whitespace-nowrap">{formatNaira(plan.price)}</span>
                      </div>
                      <ChevronRight size={14} className="mt-3 text-gray-300 group-hover:text-shb-gold-dark transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: Confirm & Pay */}
          {currentStep === 2 && selectedPlan && selectedNetwork && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setCurrentStep(1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 font-display">Confirm & Pay</h2>
                  <p className="text-sm text-gray-500">Enter recipient phone number</p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-shb-gold-soft/20 border border-shb-gold-soft rounded-2xl p-5 mb-8">
                <p className="text-xs font-black text-shb-gold-dark uppercase tracking-widest mb-3">Order Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-bold text-gray-900">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Network</span>
                    <span className="font-bold text-gray-900">{selectedNetwork.name}</span>
                  </div>
                  {selectedPlan.validity && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Validity</span>
                      <span className="font-bold text-gray-900">{selectedPlan.validity}</span>
                    </div>
                  )}
                  <div className="h-px bg-shb-gold-soft my-2" />
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-extrabold text-shb-navy">{formatNaira(selectedPlan.price)}</span>
                  </div>
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-semibold text-gray-700 block">Recipient Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all font-mono text-lg tracking-widest"
                    placeholder="08012345678"
                    maxLength={11}
                  />
                </div>
                {phoneNumber.length > 0 && !isValidPhone && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> Enter a valid 11-digit Nigerian phone number
                  </p>
                )}
                {isValidPhone && (
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} /> Valid phone number
                  </p>
                )}
              </div>

              {/* Saved numbers — quick select */}
              {recents.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mr-1">
                    <Clock size={11} /> Recent:
                  </span>
                  {recents.map((num) => (
                    <button
                      key={num}
                      onClick={() => setPhoneNumber(num)}
                      className="px-3 py-1 rounded-lg text-xs font-mono font-bold border border-gray-200 text-gray-600 hover:border-shb-gold hover:text-shb-navy transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {paymentError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-700"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {paymentError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3 text-xs text-gray-600">
                <Wallet size={14} className="shrink-0 mt-0.5 text-shb-gold-dark" />
                Payment will be deducted from your wallet balance. Data is delivered automatically after payment.
              </div>

              <button
                onClick={handlePay}
                disabled={!isValidPhone || isProcessing}
                className="shb-btn-primary w-full text-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><Loader2 className="animate-spin" size={20} /> Processing...</>
                ) : (
                  <>Pay {formatNaira(selectedPlan.price)} from Wallet</>
                )}
              </button>

              <button onClick={reset} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors">
                Cancel and start over
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
