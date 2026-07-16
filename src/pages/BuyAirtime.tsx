import { useState } from 'react';
import { Smartphone, ArrowLeft, Loader2, AlertCircle, Wallet, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { products as productsApi, matchesProvider, purchase, NETWORKS, AIRTIME_UNIT_COST, formatNaira, type Product } from '../lib/api';
import { recentNumbers } from '../lib/localPrefs';
import PageHeader from '../components/PageHeader';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const AIRTIME_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000];

export default function BuyAirtime() {
  useDocumentTitle('Buy Airtime');
  const { user, refreshUser } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState<typeof NETWORKS[number] | null>(null);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [airtimePlans, setAirtimePlans] = useState<Product[]>([]);
  const [recents] = useState<string[]>(recentNumbers.get());

  const isValidPhone  = /^(07|08|09)\d{9}$/.test(phoneNumber.replace(/\s/g, ''));
  const isValidAmount = Number(amount) >= 50 && Number(amount) <= 50000;

  const handleNetworkSelect = async (network: typeof NETWORKS[number]) => {
    setSelectedNetwork(network);
    setError('');
    setStep(1);
    try {
      const res = await productsApi.list();
      setAirtimePlans(res.products.filter((p) => (p.category || p.cat) === 'airtime'));
    } catch {}
  };

  const handlePay = async () => {
    if (!selectedNetwork || !amount || !phoneNumber || !user?.email) return;
    setError('');
    setIsProcessing(true);

    try {
      // Find the airtime product for this network
      const networkPlans = airtimePlans.filter((p) => matchesProvider(p, selectedNetwork.id));
      const plan = networkPlans[0];

      if (!plan) {
        throw new Error(`${selectedNetwork.name} airtime not available. Please contact support.`);
      }

      // quantity = how many ₦100 units the user wants
      // e.g. user wants ₦500 → quantity = 5 → backend dispatches ₦500 airtime
      const quantity = Number(amount) / AIRTIME_UNIT_COST;

      if (user.walletBalance == null || user.walletBalance < Number(amount)) {
        setError('Insufficient wallet balance. Please fund your wallet first.');
        setIsProcessing(false);
        return;
      }

      await purchase.buyAirtime({
        network: selectedNetwork.id,
        phone: phoneNumber.replace(/\s/g, ''),
        amount: Number(amount),
      });

      recentNumbers.add(phoneNumber);
      await refreshUser();
      window.location.href = '/app/transactions';
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 content-reveal">
      <PageHeader title="Buy Airtime" description="Top up any network instantly." icon={Smartphone} backTo="/app" />

      <div className="shb-card p-4 sm:p-6 md:p-10">
        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div key="net" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 font-display">Select Network</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {NETWORKS.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => handleNetworkSelect(net)}
                    className="p-4 sm:p-6 rounded-2xl border-2 border-gray-100 hover:border-shb-gold transition-all group text-left touch-manipulation"
                  >
                    <div className={cn('w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black mb-3 sm:mb-4 transition-transform group-hover:scale-110', net.bg, net.textColor)}>
                      {net.id[0].toUpperCase()}
                    </div>
                    <p className="font-bold text-gray-900 text-sm sm:text-base">{net.name}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && selectedNetwork && (
            <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => { setStep(0); setError(''); }} className="p-2 hover:bg-gray-50 rounded-xl">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg', selectedNetwork.bg, selectedNetwork.textColor)}>
                  {selectedNetwork.id[0].toUpperCase()}
                </div>
                <h2 className="text-lg font-extrabold text-gray-900 font-display">{selectedNetwork.name}</h2>
              </div>

              {/* Amount */}
              <div className="mb-6">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">Amount (₦)</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {AIRTIME_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmount(String(a))}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all touch-manipulation',
                        amount === String(a)
                          ? 'border-shb-gold bg-shb-gold-soft/40 text-shb-gold-dark'
                          : 'border-gray-100 text-gray-700 hover:border-shb-gold-soft',
                      )}
                    >
                      {formatNaira(a)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Or enter custom amount (min ₦50)"
                  min="50" max="50000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold outline-none transition-all"
                />
              </div>

              {/* Phone */}
              <div className="mb-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                    placeholder="08012345678"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold outline-none font-mono tracking-widest transition-all"
                  />
                </div>
              </div>

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
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
                    <AlertCircle size={16} /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-6 p-4 bg-gray-50 rounded-xl flex items-start gap-3 text-xs text-gray-600">
                <Wallet size={14} className="shrink-0 mt-0.5 text-shb-gold-dark" />
                Payment will be deducted from your wallet balance.
              </div>

              <button
                onClick={handlePay}
                disabled={!isValidPhone || !isValidAmount || isProcessing}
                className="shb-btn-primary w-full text-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><Loader2 className="animate-spin" size={20} /> Processing...</>
                ) : (
                  <>Pay {amount ? formatNaira(Number(amount)) : '---'} from Wallet</>
                )}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
