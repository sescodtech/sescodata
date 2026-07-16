import { useState, useEffect } from 'react';
import { GraduationCap, Loader2, AlertCircle, ArrowLeft, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { products as productsApi, purchase, formatNaira, type Product } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';

export default function ExamPinsPage() {
  useDocumentTitle('Exam PINs');
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<Product[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await productsApi.byCategory('education');
        setPlans(res);
      } catch {
        setError('Failed to load exam PIN products. Please try again.');
      } finally {
        setIsLoadingPlans(false);
      }
    })();
  }, []);

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
      window.location.href = '/app/transactions';
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 content-reveal pb-12">
      <PageHeader
        title="Exam PINs"
        description="WAEC / NECO result checker PINs, delivered instantly."
        icon={GraduationCap}
        backTo="/app"
      />

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
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 font-display">Select PIN Type</h2>
              {isLoadingPlans ? (
                <SkeletonList rows={2} />
              ) : plans.length === 0 ? (
                <EmptyState icon={GraduationCap} title="No exam PIN products available right now" />
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <button key={plan.id} onClick={() => { setSelectedPlan(plan); setQuantity(1); setStep(1); }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-shb-gold transition-all text-left">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{plan.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Instant PIN generation</p>
                      </div>
                      <span className="font-extrabold text-shb-navy">{formatNaira(plan.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && selectedPlan && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setStep(0)} className="p-2 hover:bg-gray-50 rounded-xl">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <h2 className="text-lg font-extrabold text-gray-900 font-display">{selectedPlan.name}</h2>
              </div>

              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">Quantity</label>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-11 h-11 rounded-xl border-2 border-gray-100 flex items-center justify-center hover:border-shb-gold transition-colors">
                  <Minus size={16} />
                </button>
                <span className="text-2xl font-extrabold w-12 text-center">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(50, q + 1))} className="w-11 h-11 rounded-xl border-2 border-gray-100 flex items-center justify-center hover:border-shb-gold transition-colors">
                  <Plus size={16} />
                </button>
              </div>

              <div className="rounded-2xl p-5 mb-6 border bg-shb-gold-soft/20 border-shb-gold-soft">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-extrabold text-shb-navy">{formatNaira(total)}</span>
                </div>
              </div>

              <button onClick={handlePay} disabled={isProcessing} className="shb-btn-primary w-full text-lg flex items-center justify-center gap-2">
                {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : <>Pay {formatNaira(total)} from Wallet</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
