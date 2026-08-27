import { useState } from 'react';
import { Tv, Zap, ArrowLeft, Loader2, AlertCircle, Wallet, CheckCircle2, PartyPopper, CreditCard, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSupportSettings } from '../context/SupportSettingsContext';
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
  { id: 'phed',  name: 'Port Harcourt PHED', logo: 'P', bg: 'bg-shb-navy' },
  { id: 'ibedc', name: 'Ibadan Disco',       logo: 'I', bg: 'bg-shb-navy' },
  { id: 'kano',  name: 'Kano Disco',         logo: 'K', bg: 'bg-shb-navy' },
];

const ELEC_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];
const STEPS = ['Provider', 'Details', 'Confirm'];

// No verified GladTidings cable (DStv/GOtv/StarTimes) plan codes exist yet, so
// Cable/TV purchases are temporarily disabled here rather than left
// reachable and failing at checkout. Flip this back to false once real
// GladTidings cable variation IDs are confirmed and wired into the catalog.
const CABLE_TEMPORARILY_DISABLED = true;

export default function UtilityBills() {
  const { user, refreshUser } = useAuth();
  const { getWhatsAppUrl } = useSupportSettings();
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
      <div className="shb-page shb-page--narrow py-14">
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

  if (!isElectricity && CABLE_TEMPORARILY_DISABLED) {
    return (
      <div className="shb-page shb-page--narrow py-14">
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-shb-gold-soft/40 flex items-center justify-center mx-auto mb-3">
            <Tv size={22} className="text-shb-gold-dark" />
          </div>
          <h2 className="shb-page-title mb-1">TV Subscription temporarily unavailable</h2>
          <p className="shb-body">We're setting this up and it'll be back shortly. Please check back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shb-page shb-page--narrow space-y-3 content-reveal pb-8">
      <PageHeader
        title={isElectricity ? 'Electricity' : 'TV Subscription'}
        description={isElectricity ? 'Pay bills instantly from your wallet.' : 'Renew DStv, GOtv, StarTimes.'}
        icon={isElectricity ? Zap : Tv}
        backTo="/app"
      />

      {/* Slim breadcrumb — replaces the oversized circle-and-line stepper */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn(
              idx === step ? 'text-shb-navy' : idx < step ? 'text-green-600' : 'text-gray-300',
            )}>
              {idx < step && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
              {label}
            </span>
            {idx < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2 text-[12px] text-red-700" role="alert">
            <div className="flex items-start gap-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="font-bold" aria-label="Dismiss">✕</button>
            </div>
            <a
              href={getWhatsAppUrl('my bill payment failed')}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-[11.5px] font-bold underline hover:no-underline"
            >
              Contact Support on WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shb-card p-3.5">
        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="shb-section-title mb-2.5">
                {isElectricity ? 'Select Disco' : 'Select TV Provider'}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {providers.map((p) => (
                  <button key={p.id} onClick={() => handleProviderSelect(p.id)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-gray-100 hover:border-shb-gold transition-all group touch-manipulation">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[13px] mb-1.5 group-hover:scale-110 transition-transform', p.bg)}>
                      {p.logo}
                    </div>
                    <span className="font-bold text-gray-900 text-[11.5px] text-center leading-tight">{p.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && activeProvider && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <button onClick={() => setStep(0)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors" aria-label="Back">
                  <ArrowLeft size={16} className="text-gray-500" />
                </button>
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[12px]', activeProvider.bg)}>
                  {activeProvider.logo}
                </div>
                <h2 className="shb-section-title">{activeProvider.name}</h2>
              </div>

              <div className="space-y-2.5">
                {!isElectricity && (
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-700 block">Select Package</label>
                    {isLoadingPlans ? (
                      <div className="flex items-center gap-2 py-3 text-gray-400">
                        <Loader2 className="animate-spin" size={15} />
                        <span className="text-[12.5px]">Loading packages…</span>
                      </div>
                    ) : cablePlans.length === 0 ? (
                      <EmptyState icon={Tv} title="No packages available" description="This provider has no packages loaded right now — try again shortly or contact support." />
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {cablePlans.map((plan) => (
                          <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                            className={cn('w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left',
                              selectedPlan?.id === plan.id ? 'border-shb-gold bg-shb-gold-soft/20' : 'border-gray-100 hover:border-shb-gold-soft')}>
                            <div>
                              <p className="font-bold text-gray-900 text-[13px]">{plan.name}</p>
                              {plan.validity && <p className="text-[11px] text-gray-400 mt-0.5">{plan.validity}</p>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-gray-900 text-[13px]">{formatNaira(plan.price)}</span>
                              {selectedPlan?.id === plan.id && <CheckCircle2 size={15} className="text-shb-gold-dark" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Input
                  label={isElectricity ? 'Meter Number' : 'IUC / SmartCard Number'}
                  icon={<CreditCard size={15} />}
                  type="text"
                  inputMode="numeric"
                  placeholder={isElectricity ? 'Enter meter number' : 'Enter IUC / smartcard number'}
                  value={smartcard}
                  onChange={(e) => setSmartcard(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
                  className="font-mono tracking-wide"
                />

                {isElectricity && (
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-700 block">Amount (₦)</label>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {ELEC_AMOUNTS.map((a) => (
                        <button key={a} onClick={() => setAmount(String(a))}
                          className={cn('py-1.5 rounded-lg text-[12px] font-bold border transition-all',
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

              <div className="mt-3 p-2.5 bg-gray-50 rounded-lg flex items-start gap-2 text-[11.5px] text-gray-500">
                <Wallet size={13} className="shrink-0 mt-0.5 text-shb-gold-dark" />
                Payment will be deducted from your wallet balance.
              </div>

              <Button onClick={() => setStep(2)} disabled={!canProceed} fullWidth size="lg" className="mt-3.5">
                Preview Order
              </Button>
            </motion.div>
          )}

          {step === 2 && activeProvider && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <button onClick={() => setStep(1)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors" aria-label="Back">
                  <ArrowLeft size={16} className="text-gray-500" />
                </button>
                <h2 className="shb-section-title">Confirm Order</h2>
              </div>

              <div className="rounded-lg p-3 mb-3.5 border bg-shb-gold-soft/20 border-shb-gold-soft">
                <p className="shb-eyebrow mb-2.5 text-shb-gold-dark">Order Summary</p>
                <div className="space-y-2 text-[13px]">
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
                  <div className="pt-2 border-t border-shb-gold-soft flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-[17px] font-extrabold text-shb-navy">
                      {isElectricity ? formatNaira(Number(amount)) : formatNaira(selectedPlan?.price ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <Button onClick={handlePay} loading={isProcessing} fullWidth size="lg">
                {isProcessing ? 'Processing…' : 'Pay from Wallet'}
              </Button>
              <button onClick={reset} className="w-full mt-2.5 text-[12.5px] text-gray-400 hover:text-gray-600 py-1.5 transition-colors">Cancel</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
