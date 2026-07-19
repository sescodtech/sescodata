import { useState } from 'react';
import { Tv, Zap, ArrowLeft, Loader2, AlertCircle, Wallet, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { products as productsApi, matchesProvider, purchase, formatNaira, type Product } from '../lib/api';
import PageHeader from '../components/PageHeader';
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
        await purchase.buyCable({
          productId: selectedPlan.id,
          smartcard,
        });
      } else {
        const amountValue = Number(amount);
        if (user.walletBalance == null || user.walletBalance < amountValue) {
          throw new Error('Insufficient wallet balance. Please fund your wallet first.');
        }
        await purchase.buyElectricity({
          disco: providerId,
          meter: smartcard,
          amount: amountValue,
        });
      }

      await refreshUser();
      window.location.href = '/app/transactions';
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 content-reveal pb-12">
      <PageHeader
        title={isElectricity ? 'Electricity Bills' : 'TV Subscription'}
        description={isElectricity ? 'Pay utility bills instantly from your wallet.' : 'Renew DStv, GOtv, StarTimes using wallet balance.'}
        icon={isElectricity ? Zap : Tv}
        backTo="/app"
      />

      {step < 3 && (
        <div className="flex gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className={cn('h-1.5 flex-1 rounded-full transition-all duration-500',
              step > s ? 'bg-shb-gold' : step === s ? 'bg-shb-gold-soft' : 'bg-gray-100')} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto font-bold">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shb-card p-4 sm:p-6 md:p-10">
        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 font-display">
                {isElectricity ? 'Select Disco / PHCN' : 'Select TV Provider'}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {providers.map((p) => (
                  <button key={p.id} onClick={() => handleProviderSelect(p.id)}
                    className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border-2 border-gray-100 hover:border-shb-gold transition-all group touch-manipulation">
                    <div className={cn('w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl sm:text-2xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform', p.bg)}>
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
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setStep(0)} className="p-2 hover:bg-gray-50 rounded-xl">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-black', activeProvider.bg)}>
                  {activeProvider.logo}
                </div>
                <h2 className="text-lg font-extrabold text-gray-900 font-display">{activeProvider.name}</h2>
              </div>

              <div className="space-y-6">
                {!isElectricity && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Select Package</label>
                    {isLoadingPlans ? (
                      <div className="flex items-center gap-2 py-6 text-gray-400">
                        <Loader2 className="animate-spin" size={18} />
                        <span className="text-sm">Loading packages...</span>
                      </div>
                    ) : cablePlans.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-400">No packages available for this provider yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {cablePlans.map((plan) => (
                          <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                            className={cn('w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left',
                              selectedPlan?.id === plan.id ? 'border-shb-gold bg-shb-gold-soft/20' : 'border-gray-100 hover:border-shb-gold-soft')}>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{plan.name}</p>
                              {plan.validity && <p className="text-xs text-gray-400 mt-0.5">{plan.validity}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900">{formatNaira(plan.price)}</span>
                              {selectedPlan?.id === plan.id && <CheckCircle2 size={18} className="text-shb-gold-dark" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
                    {isElectricity ? 'Meter Number' : 'IUC / SmartCard Number'}
                  </label>
                  <input type="text"
                    placeholder={isElectricity ? 'Enter Meter No.' : 'Enter IUC / Smartcard No.'}
                    value={smartcard}
                    onChange={(e) => setSmartcard(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all font-mono tracking-widest" />
                </div>

                {isElectricity && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Amount (₦)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {ELEC_AMOUNTS.map((a) => (
                        <button key={a} onClick={() => setAmount(String(a))}
                          className={cn('px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all',
                            amount === String(a) ? 'border-shb-gold bg-shb-gold-soft/40 text-shb-gold-dark' : 'border-gray-100 text-gray-700 hover:border-shb-gold-soft')}>
                          {formatNaira(a)}
                        </button>
                      ))}
                    </div>
                    <input type="number" placeholder="Or enter custom amount (min ₦500)"
                      value={amount} onChange={(e) => setAmount(e.target.value)} min="500"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all" />
                  </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-xl flex items-start gap-3 text-xs text-gray-500">
                <Wallet size={14} className="shrink-0 mt-0.5 text-shb-gold-dark" />
                Payment will be deducted from your wallet balance.
              </div>

              <button onClick={() => setStep(2)} disabled={!canProceed} className="shb-btn-primary mt-6 w-full text-lg">
                Preview Order
              </button>
            </motion.div>
          )}

          {step === 2 && activeProvider && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-50 rounded-xl">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <h2 className="text-lg font-extrabold text-gray-900 font-display">Confirm Order</h2>
              </div>

              <div className="rounded-2xl p-5 mb-6 border bg-shb-gold-soft/20 border-shb-gold-soft">
                <p className="text-xs font-black uppercase tracking-widest mb-4 text-shb-gold-dark">Order Summary</p>
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

              <button onClick={handlePay} disabled={isProcessing} className="shb-btn-primary w-full text-lg flex items-center justify-center gap-2">
                {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : <>Pay from Wallet</>}
              </button>
              <button onClick={reset} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">Cancel</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
