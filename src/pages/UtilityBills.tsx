import { useState } from 'react';
import { Tv, Zap, ArrowLeft, Loader2, AlertCircle, Wallet, CheckCircle2, PartyPopper, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { products as productsApi, matchesProvider, purchase, formatNaira, type Product } from '../lib/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../lib/useDocumentTitle';

// IDs MUST match backend `provider` field exactly
const TV_PROVIDERS = [
  { id: 'dstv_subscription', name: 'DStv',      logo: 'D', bg: 'bg-blue-700' },
  { id: 'gotv_subscription', name: 'GOtv',      logo: 'G', bg: 'bg-orange-500' },
  { id: 'startimes',         name: 'StarTimes', logo: 'S', bg: 'bg-red-700' },
];

const ELEC_PROVIDERS = [
  { id: 'ikedc', name: 'Ikeja Electric',     logo: 'I', bg: 'bg-shb-navy' },
  { id: 'ekedc', name: 'Eko Electric',       logo: 'E', bg: 'bg-shb-navy' },
  { id: 'aedc',  name: 'Abuja Electric',     logo: 'A', bg: 'bg-shb-navy' },
  { id: 'phden', name: 'Port Harcourt PHED', logo: 'P', bg: 'bg-shb-navy' },
  { id: 'ibedc', name: 'Ibadan Disco',       logo: 'I', bg: 'bg-shb-navy' },
  { id: 'kedco', name: 'Kano Disco',         logo: 'K', bg: 'bg-shb-navy' },
];

const ELEC_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];
const STEPS = ['Select Provider', 'Enter Details', 'Confirm & Pay'];

export default function UtilityBills() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const isElectricity = location.pathname.includes('electricity');
  useDocumentTitle(isElectricity ? 'Electricity' : 'TV Subscription');

  const [step, setStep]                     = useState(0);
  const [providerId, setProviderId]         = useState('');
  const [smartcard, setSmartcard]           = useState('');
  const [amount, setAmount]                 = useState('');
  const [cablePlans, setCablePlans]         = useState<Product[]>([]);
  const [selectedPlan, setSelectedPlan]     = useState<Product | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [error, setError]                   = useState('');
  const [justPaid, setJustPaid]             = useState(false);

  const providers      = isElectricity ? ELEC_PROVIDERS : TV_PROVIDERS;
  const activeProvider = providers.find((p) => p.id === providerId);

  const loadCablePlans = async (prov: string) => {
    if (isElectricity) return;
    setIsLoadingPlans(true);
    setCablePlans([]);
    setSelectedPlan(null);
    try {
      const res = await productsApi.list();
      const plans = res.products.filter(
        (p) => (p.category === 'cable' || p.cat === 'cable') && matchesProvider(p, prov),
      );
      setCablePlans(plans);
    } catch {
      setError('Failed to load cable plans. Please try again.');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleProviderSelect = async (prov: string) => {
    setProviderId(prov);
    setSelectedPlan(null);
    setSmartcard('');
    setAmount('');
    setError('');
    await loadCablePlans(prov);
    setStep(1);
  };

  const handlePay = async () => {
    if (!user?.email) return;
    setError('');
    setIsProcessing(true);
    try {
      if (!isElectricity) {
        if (!selectedPlan) throw new Error('Please select a cable package.');
        if (user.walletBalance == null || user.walletBalance < selectedPlan.price) {
          throw new Error('Insufficient wallet balance. Please fund your wallet first.');
        }
        await purchase.buyCable({ productId: selectedPlan.id, smartcard });
      } else {
        const amountValue = Number(amount);
        if (user.walletBalance == null || user.walletBalance < amountValue) {
          throw new Error('Insufficient wallet balance. Please fund your wallet first.');
        }
        await purchase.buyElectricity({ disco: providerId, meter: smartcard, amount: amountValue });
      }

      await refreshUser();
      setJustPaid(true);
      setTimeout(() => { window.location.href = '/app/transactions'; }, 1400);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStep(0); setProviderId(''); setSmartcard(''); setAmount('');
    setSelectedPlan(null); setCablePlans([]); setError('');
  };

  const isValidSmartcard = smartcard.trim().length >= 8;
  const isValidAmount    = Number(amount) >= 500;
  const canProceed = isElectricity
    ? isValidSmartcard && isValidAmount
    : isValidSmartcard && !!selectedPlan;

  if (justPaid) {
    return (
      <div className="max-w-md mx-auto py-16">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <PartyPopper size={28} className="text-green-500" />
          </div>
          <h2 className="shb-page-title mb-1.5">Payment sent!</h2>
          <p className="shb-body">Taking you to your receipt…</p>
          <Loader2 className="animate-spin text-shb-gold-dark mx-auto mt-5" size={20} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 content-reveal pb-12">
      <PageHeader
        title={isElectricity ? 'Electricity Bills' : 'TV Subscription'}
        description={isElectricity ? 'Pay utility bills instantly from your wallet.' : 'Renew DStv, GOtv, StarTimes using wallet balance.'}
        icon={isElectricity ? Zap : Tv}
        backTo="/app"
      />

      {/* Step indicator — same visual language as Buy Data */}
      <div className="flex items-center justify-between px-1 sm:px-2">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex flex-col items-center relative flex-1">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10',
              idx < step ? 'bg-green-600 text-white' :
              idx === step ? 'bg-shb-navy text-white ring-4 ring-shb-gold-soft/60' :
              'bg-gray-200 text-gray-500',
            )}>
              {idx < step ? <CheckCircle2 size={14} /> : idx + 1}
            </div>
            <span className={cn('mt-1.5 text-[9px] font-bold uppercase tracking-widest text-center leading-tight', idx === step ? 'text-shb-navy' : 'text-gray-400')}>
              {label}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={cn('absolute top-4 left-1/2 w-full h-[2px] -z-0', idx < step ? 'bg-green-600' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="font-bold" aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shb-card p-4 sm:p-6">
        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="shb-section-title mb-4">
                {isElectricity ? 'Select Disco / PHCN' : 'Select TV Provider'}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {providers.map((p) => (
                  <button key={p.id} onClick={() => handleProviderSelect(p.id)}
                    className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 border-gray-100 hover:border-shb-gold transition-all duration-200 group touch-manipulation">
                    <div className={cn('w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-xl mb-3 group-hover:scale-110 transition-transform duration-200', p.bg)}>
                      {p.logo}
                    </div>
                    <span className="font-bold text-gray-900 text-sm text-center">{p.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && activeProvider && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep(0)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors" aria-label="Back">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-black', activeProvider.bg)}>
                  {activeProvider.logo}
                </div>
                <h2 className="shb-section-title">{activeProvider.name}</h2>
              </div>

              <div className="space-y-5">
                {!isElectricity && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-700 block">Select Package</label>
                    {isLoadingPlans ? (
                      <div className="flex items-center gap-2 py-6 text-gray-400">
                        <Loader2 className="animate-spin" size={18} />
                        <span className="text-sm">Loading packages...</span>
                      </div>
                    ) : cablePlans.length === 0 ? (
                      <EmptyState icon={Tv} title="No packages available" description="This provider has no packages loaded right now — try again shortly or contact support." />
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {cablePlans.map((plan) => (
                          <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                            className={cn('w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-200 text-left',
                              selectedPlan?.id === plan.id ? 'border-shb-gold bg-shb-gold-soft/20' : 'border-gray-100 hover:border-shb-gold-soft')}>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{plan.name}</p>
                              {plan.validity && <p className="text-xs text-gray-400 mt-0.5">{plan.validity}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900 text-sm">{formatNaira(plan.price)}</span>
                              {selectedPlan?.id === plan.id && <CheckCircle2 size={17} className="text-shb-gold-dark" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Input
                  label={isElectricity ? 'Meter Number' : 'IUC / SmartCard Number'}
                  icon={<CreditCard size={16} />}
                  type="text"
                  inputMode="numeric"
                  placeholder={isElectricity ? 'Enter meter number' : 'Enter IUC / smartcard number'}
                  value={smartcard}
                  onChange={(e) => setSmartcard(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
                  className="font-mono tracking-widest"
                />

                {isElectricity && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-700 block">Amount (₦)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {ELEC_AMOUNTS.map((a) => (
                        <button key={a} onClick={() => setAmount(String(a))}
                          className={cn('px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all duration-200',
                            amount === String(a) ? 'border-shb-gold bg-shb-gold-soft/40 text-shb-gold-dark' : 'border-gray-100 text-gray-700 hover:border-shb-gold-soft')}>
                          {formatNaira(a)}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number" inputMode="numeric" placeholder="Or enter custom amount (min ₦500)"
                      value={amount} onChange={(e) => setAmount(e.target.value)} min="500"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 p-3.5 bg-gray-50 rounded-xl flex items-start gap-2.5 text-xs text-gray-500">
                <Wallet size={14} className="shrink-0 mt-0.5 text-shb-gold-dark" />
                Payment will be deducted from your wallet balance.
              </div>

              <Button onClick={() => setStep(2)} disabled={!canProceed} fullWidth size="lg" className="mt-5">
                Preview Order
              </Button>
            </motion.div>
          )}

          {step === 2 && activeProvider && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors" aria-label="Back">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <h2 className="shb-section-title">Confirm Order</h2>
              </div>

              <div className="rounded-2xl p-5 mb-6 border bg-shb-gold-soft/20 border-shb-gold-soft">
                <p className="shb-eyebrow mb-4 text-shb-gold-dark">Order Summary</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Provider</span>
                    <span className="font-bold">{activeProvider.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isElectricity ? 'Meter No.' : 'SmartCard'}</span>
                    <span className="font-mono font-bold">{smartcard}</span>
                  </div>
                  {!isElectricity && selectedPlan && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Package</span>
                      <span className="font-bold">{selectedPlan.name}</span>
                    </div>
                  )}
                  {!isElectricity && selectedPlan?.validity && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-bold">{selectedPlan.validity}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-shb-gold-soft flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-extrabold text-shb-navy">
                      {isElectricity ? formatNaira(Number(amount)) : formatNaira(selectedPlan?.price ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <Button onClick={handlePay} loading={isProcessing} fullWidth size="lg">
                {isProcessing ? 'Processing…' : 'Pay from Wallet'}
              </Button>
              <button onClick={reset} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">Cancel</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
