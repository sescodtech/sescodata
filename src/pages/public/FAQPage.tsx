import { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import PublicPageShell from '../../components/PublicPageShell';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const FAQS = [
  { q: 'How long does delivery take?', a: 'Most data, airtime, cable and electricity purchases are delivered within seconds of payment. If a delivery ever fails, your wallet is refunded automatically \u2014 no waiting on support.' },
  { q: 'What happens if I enter the wrong phone number or meter number?', a: 'Once a transaction is processed and delivered, we cannot reverse it. Please always double-check the recipient details before confirming a purchase.' },
  { q: 'How do I fund my wallet?', a: 'From your dashboard, go to Wallet \u2192 Fund Wallet, choose or enter an amount, and complete payment securely through Paystack. Your balance updates instantly.' },
  { q: 'Is there a subscription fee?', a: 'No. SescoHub has no monthly fees or hidden charges. You only pay for what you buy, at the price shown before you confirm.' },
  { q: 'What happens if a purchase fails?', a: 'If our provider can\u2019t deliver your order, the amount is automatically refunded to your wallet and the transaction is marked as failed \u2014 you can see this in your Transactions page.' },
  { q: 'Which networks and providers are supported?', a: 'MTN, Airtel, Glo and 9mobile for data/airtime; DStv, GOtv and StarTimes for cable; and 6+ electricity Discos nationwide, plus WAEC/NECO exam PINs.' },
  { q: 'Is my payment information secure?', a: 'Yes. All wallet funding is processed by Paystack, one of Nigeria\u2019s most trusted payment gateways. We never store your card details.' },
  { q: 'Can I get a refund to my bank account?', a: 'Failed purchases are refunded to your SescoHub wallet automatically. For wallet-to-bank withdrawals, please contact support.' },
];

export default function FAQPage() {
  useDocumentTitle('FAQ', 'Frequently asked questions about funding your wallet, delivery times, refunds and supported networks on SescoHub.');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <PublicPageShell eyebrow="FAQ" title="Frequently asked questions" description="Everything you need to know about using SescoHub.">
      <div className="space-y-3 max-w-3xl mx-auto">
        {FAQS.map((faq, i) => (
          <div key={faq.q} className="shb-card overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left"
            >
              <span className="font-bold text-gray-900 text-sm sm:text-base">{faq.q}</span>
              <ChevronDown size={18} className={cn('text-gray-400 shrink-0 transition-transform', openIndex === i && 'rotate-180 text-shb-gold-dark')} />
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <p className="px-5 sm:px-6 pb-5 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="text-center mt-14">
        <p className="text-gray-500 mb-4">Still have questions?</p>
        <Link to="/contact" className="shb-btn-primary inline-flex items-center gap-2 px-8 py-3.5">
          Contact Support <ArrowRight size={18} />
        </Link>
      </div>
    </PublicPageShell>
  );
}
