import { Check, ArrowRight, Database, Smartphone, Tv, Zap, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicPageShell from '../../components/PublicPageShell';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const CATEGORIES = [
  { icon: Database, title: 'Mobile Data', desc: 'SME, Gifting & Corporate plans across MTN, Airtel, Glo & 9mobile.', note: 'Priced per plan \u2014 see live rates after signup' },
  { icon: Smartphone, title: 'Airtime', desc: 'Instant top-up for any network, any amount from \u20a650.', note: 'No markup \u2014 face value pricing' },
  { icon: Tv, title: 'Cable TV', desc: 'DStv, GOtv & StarTimes subscription renewals.', note: 'Priced per package' },
  { icon: Zap, title: 'Electricity', desc: 'Prepaid & postpaid tokens for 6+ Discos nationwide.', note: 'Small service fee added at checkout' },
  { icon: GraduationCap, title: 'Exam PINs', desc: 'WAEC and NECO result checker PINs, generated instantly.', note: 'Fixed price per PIN' },
];

const INCLUDED = [
  'No monthly subscription or account fees',
  'No hidden charges \u2014 the price you see is the price you pay',
  'Automatic refund to wallet if a delivery fails',
  'Wallet funding secured by Paystack',
  'Real-time delivery on every purchase',
];

export default function PricingPage() {
  useDocumentTitle('Pricing', 'Simple, transparent pricing — no subscriptions, no hidden charges. Fund your wallet and pay only for what you buy.');
  return (
    <PublicPageShell eyebrow="Pricing" title="Simple, transparent pricing" description="No subscriptions. No hidden charges. Fund your wallet and pay only for what you buy.">
      <div className="space-y-16">
        <div className="text-center rounded-3xl bg-gradient-to-br from-shb-navy to-shb-navy-3 text-white p-10 sm:p-14">
          <p className="text-shb-gold-soft text-xs font-black uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display mb-4">Fund your wallet. Pay exactly what's shown. That's it.</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            There's no signup fee and no recurring subscription. You top up your wallet via Paystack whenever you like,
            and every purchase deducts the exact displayed price \u2014 what you see at checkout is what you pay.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 font-display mb-8 text-center">What you can buy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((c) => (
              <div key={c.title} className="shb-card p-6">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-shb-gold-soft/50 text-shb-gold-dark mb-4">
                  <c.icon size={20} />
                </div>
                <h3 className="font-bold text-gray-900">{c.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
                <p className="text-xs font-bold text-shb-gold-dark mt-3">{c.note}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            Exact plan prices vary by network and package \u2014 sign in to see live, real-time pricing before you buy.
          </p>
        </div>

        <div className="shb-card p-8 sm:p-10">
          <h2 className="text-xl font-extrabold text-gray-900 font-display mb-6">Every account includes</h2>
          <ul className="space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-700">
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={12} strokeWidth={3} />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center rounded-3xl bg-shb-gold-soft/20 border border-shb-gold-soft p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-display mb-3">Start saving today</h2>
          <p className="text-gray-600 mb-8">Create your free account \u2014 no card required until you're ready to fund your wallet.</p>
          <Link to="/signup" className="shb-btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
}
