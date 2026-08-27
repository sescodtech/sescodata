import { useState, useEffect } from 'react';
import { GraduationCap, Loader2, AlertCircle, ArrowLeft, Minus, Plus, RefreshCw, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useSupportSettings } from '../context/SupportSettingsContext';
import { products as productsApi, purchase, formatNaira, type Product } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';

export default function ExamPinsPage() {
  useDocumentTitle('Exam PINs');
  const { user, refreshUser } = useAuth();
  const { getWhatsAppUrl } = useSupportSettings();
  const [plans, setPlans] = useState<Product[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [justPaid, setJustPaid] = useState(false);

  const loadPlans = async () => {
    setIsLoadingPlans(true);
    setLoadError('');
    try {
      const res = await productsApi.byCategory('education');
      setPlans(res);
    } catch {
      setLoadError('Failed to load exam PIN products. Please try again.');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const total = (selectedPlan?.price ?? 0) * quantity;

  const handlePay = async () => {
    if (!selectedPlan || !user) return;
    setError('');
    setIsProcessing(true);
    try {
      if (user.walletBalance == null || user.walletBalance < total) {
        throw new Error('Insufficient wallet balance. Please fund your wallet first.');
      }
      await purchase.buyExamPin({ productId: selectedPlan.id, quantity });
      await refreshUser();
      setJustPaid(true);
      setTimeout(() => { window.location.href = '/app/transactions'; }, 1400);
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (justPaid) {
    return (
      <div className="shb-page shb-page--narrow py-16">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <PartyPopper size={28} className="text-green-500" />
          </div>
          <h2 className="shb-page-title mb-1.5">PIN purchase sent!</h2>
          <p className="shb-body">Taking you to your receipt…</p>
          <Loader2 className="animate-spin text-shb-gold-dark mx-auto mt-5" size={20} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="shb-page shb-page--narrow space-y-3 content-reveal pb-12">
      <PageHeader
        title="Exam PINs"
        description="WAEC / NECO result checker PINs, delivered instantly."
        icon={GraduationCap}
        backTo="/app"
      />

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2 text-sm text-red-700" role="alert">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="font-bold" aria-label="Dismiss">✕</button>
            </div>
            <a
              href={getWhatsAppUrl('my exam PIN purchase failed')}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-[12.5px] font-bold underline hover:no-underline"
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
              <h2 className="shb-section-title mb-2.5">Select PIN Type</h2>
              {isLoadingPlans ? (
                <SkeletonList rows={2} />
              ) : loadError ? (
                <EmptyState
                  icon={AlertCircle}
                  variant="error"
                  title={loadError}
                  action={<Button size="sm" icon={<RefreshCw size={14} />} onClick={loadPlans} className="mt-1">Try again</Button>}
                />
              ) : plans.length === 0 ? (
                <EmptyState icon={GraduationCap} title="No exam PIN products available right now" description="Check back shortly — providers refresh their catalog regularly." />
              ) : (
                <div className="space-y-1.5">
                  {plans.map((plan) => (
                    <button key={plan.id} onClick={() => { setSelectedPlan(plan); setQuantity(1); setStep(1); }}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-shb-gold transition-all text-left">
                      <div>
                        <p className="font-bold text-gray-900 text-[13px]">{plan.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Instant PIN generation</p>
                      </div>
                      <span className="font-extrabold text-shb-navy text-[14px]">{formatNaira(plan.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && selectedPlan && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <button onClick={() => setStep(0)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors" aria-label="Back">
                  <ArrowLeft size={16} className="text-gray-500" />
                </button>
                <h2 className="shb-section-title">{selectedPlan.name}</h2>
              </div>

              <label className="text-[12px] font-bold text-gray-700 block mb-2">Quantity</label>
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 rounded-lg border border-gray-100 flex items-center justify-center hover:border-shb-gold active:scale-95 transition-all"
                >
                  <Minus size={14} />
                </button>
                <span className="text-[15px] font-extrabold w-7 text-center tabular-nums">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  aria-label="Increase quantity"
                  className="w-9 h-9 rounded-lg border border-gray-100 flex items-center justify-center hover:border-shb-gold active:scale-95 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="rounded-lg p-3 mb-3.5 border bg-shb-gold-soft/20 border-shb-gold-soft">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-[13px]">Total</span>
                  <span className="text-[17px] font-extrabold text-shb-navy">{formatNaira(total)}</span>
                </div>
              </div>

              <Button onClick={handlePay} loading={isProcessing} fullWidth size="lg">
                {isProcessing ? 'Processing…' : `Pay ${formatNaira(total)} from Wallet`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
