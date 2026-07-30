import { useState, useEffect, useMemo } from 'react';
import { Smartphone, Loader2, AlertCircle, Wallet, Clock, PartyPopper, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { products as productsApi, matchesProvider, purchase, NETWORKS, detectNetworkId, formatNaira, type Product } from '../lib/api';
import { recentNumbers } from '../lib/localPrefs';
import { getSupportWhatsAppUrl } from '../components/FloatingSupportButtons';
import PageHeader from '../components/PageHeader';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const AIRTIME_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000];

export default function BuyAirtime() {
  useDocumentTitle('Buy Airtime');
  const { user, refreshUser } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [manualNetworkId, setManualNetworkId] = useState<string | null>(null);
  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [justPaid, setJustPaid] = useState(false);
  const [airtimePlans, setAirtimePlans] = useState<Product[]>([]);
  const [recents] = useState<string[]>(recentNumbers.get());

  useEffect(() => {
    productsApi.list().then((res) => {
      setAirtimePlans(res.products.filter((p) => (p.category || p.cat) === 'airtime'));
    }).catch(() => {});
  }, []);

  const detectedNetworkId = useMemo(() => {
    const clean = phoneNumber.replace(/\s/g, '');
    return clean.length >= 4 ? detectNetworkId(clean) : null;
  }, [phoneNumber]);

  const activeNetworkId = manualNetworkId || detectedNetworkId;
  const activeNetwork = NETWORKS.find((n) => n.id === activeNetworkId) || null;

  const isValidPhone = /^(07|08|09)\d{9}$/.test(phoneNumber.replace(/\s/g, ''));
  const isValidAmount = Number(amount) >= 50 && Number(amount) <= 50000;
  const canPay = isValidPhone && isValidAmount && !!activeNetwork;

  const handlePay = async () => {
    if (!activeNetwork || !amount || !phoneNumber || !user?.email) return;
    setError('');
    setIsProcessing(true);
    try {
      const plan = airtimePlans.find((p) => matchesProvider(p, activeNetwork.id));
      if (!plan) throw new Error(`${activeNetwork.name} airtime not available. Please contact support.`);
      if (user.walletBalance == null || user.walletBalance < Number(amount)) {
        setError('Insufficient wallet balance. Please fund your wallet first.');
        setIsProcessing(false);
        return;
      }
      await purchase.buyAirtime({ network: activeNetwork.id, phone: phoneNumber.replace(/\s/g, ''), amount: Number(amount) });
      recentNumbers.add(phoneNumber);
      await refreshUser();
      setJustPaid(true);
      setTimeout(() => { window.location.href = '/app/transactions'; }, 1400);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
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
      <PageHeader title="Buy Airtime" description="Top up any network instantly." icon={Smartphone} backTo="/app" />

      <div className="shb-card p-3.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Phone Number</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="tel"
              autoFocus
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all font-mono text-[15px] tracking-wide"
              placeholder="08012345678"
              maxLength={11}
            />
          </div>

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
                      onClick={() => { setManualNetworkId(n.id); setNetworkPickerOpen(false); }}
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
                onClick={() => setPhoneNumber(num)}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border border-gray-200 text-gray-600 hover:border-shb-gold hover:text-shb-navy transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn('shb-card p-3.5 transition-opacity', !activeNetwork && 'opacity-40 pointer-events-none')}>
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-2">Amount</label>
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {AIRTIME_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              className={cn(
                'py-2 rounded-lg text-[12.5px] font-bold border transition-all',
                amount === String(a) ? 'border-shb-gold bg-shb-gold-soft/40 text-shb-gold-dark' : 'border-gray-100 text-gray-700 hover:border-shb-gold-soft',
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
          placeholder="Custom amount (min ₦50)"
          min="50" max="50000"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shb-gold outline-none transition-all text-[14px]"
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2 text-[12px] text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={13} /> {error}
            </div>
            <a
              href={getSupportWhatsAppUrl('my airtime purchase failed')}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-[11.5px] font-bold underline hover:no-underline"
            >
              Contact Support on WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2.5 bg-gray-50 rounded-lg flex items-start gap-2 text-[11.5px] text-gray-600">
        <Wallet size={13} className="shrink-0 mt-0.5 text-shb-gold-dark" />
        Deducted from your wallet balance.
      </div>

      <button
        onClick={handlePay}
        disabled={!canPay || isProcessing}
        className="shb-btn-primary w-full text-[15px] flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <><Loader2 className="animate-spin" size={17} /> Processing…</>
        ) : (
          <>Pay {amount ? formatNaira(Number(amount)) : '—'}</>
        )}
      </button>
    </div>
  );
}
