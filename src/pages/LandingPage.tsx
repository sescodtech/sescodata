import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, ShieldCheck, Database, Zap, Tv, CheckCircle2, Star, GraduationCap, Wallet, RefreshCw, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const SERVICES = [
  { icon: Database, title: 'Mobile Data', desc: 'SME, Gifting & Corporate plans, all networks.', to: '/login' },
  { icon: Smartphone, title: 'Airtime', desc: 'Instant top-up, any network, any amount.', to: '/login' },
  { icon: Tv, title: 'Cable TV', desc: 'DStv, GOtv, StarTimes renewals in seconds.', to: '/login' },
  { icon: Zap, title: 'Electricity', desc: 'Prepaid & postpaid tokens, 6+ Discos.', to: '/login' },
  { icon: GraduationCap, title: 'Exam PINs', desc: 'WAEC & NECO result checker PINs.', to: '/login' },
];

const FEATURES = [
  { icon: Zap, title: 'Lightning Fast Delivery', desc: 'Orders delivered in seconds via automated, 24/7 processing \u2014 no manual approvals.' },
  { icon: ShieldCheck, title: 'Secured by Paystack', desc: "Every wallet top-up is encrypted and processed by Nigeria's most trusted payment gateway." },
  { icon: RefreshCw, title: 'Automatic Failover', desc: 'We route every order across multiple upstream suppliers, so outages rarely reach you.' },
  { icon: Wallet, title: 'One Wallet, Every Service', desc: 'Fund once, then buy data, airtime, cable, electricity and exam PINs from the same balance.' },
  { icon: Lock, title: 'Automatic Refunds', desc: "If a delivery fails, you're refunded to your wallet instantly \u2014 no support ticket needed." },
  { icon: CheckCircle2, title: 'Transparent Pricing', desc: 'The price you see at checkout is exactly what you pay. No subscriptions, no hidden fees.' },
];

const TRUST_INDICATORS = [
  { icon: ShieldCheck, label: 'Paystack Secured' },
  { icon: Lock, label: 'Encrypted Wallet' },
  { icon: RefreshCw, label: 'Automatic Refunds' },
  { icon: CheckCircle2, label: 'No Hidden Fees' },
];

const STATS = [
  { num: '4', label: 'Networks Supported' },
  { num: '3', label: 'Cable TV Providers' },
  { num: '6+', label: 'Electricity Discos' },
  { num: '24/7', label: 'Automated Delivery' },
];

const NETWORKS = [
  { id: 'mtn',     name: 'MTN',     bg: 'bg-yellow-400', text: 'text-gray-900' },
  { id: 'airtel',  name: 'Airtel',  bg: 'bg-red-600',    text: 'text-white' },
  { id: 'glo',     name: 'Glo',     bg: 'bg-green-600',  text: 'text-white' },
  { id: '9mobile', name: '9Mobile', bg: 'bg-emerald-800',text: 'text-white' },
];

const TESTIMONIALS = [
  { name: 'Chidi Emmanuel', location: 'Lagos', text: "Best platform I've ever used for cheap data. MTN SME plans are always available, and I've never had a delayed order.", rating: 5 },
  { name: 'Amina Bello', location: 'Abuja', text: 'I buy data for my whole family from SescoHub. Never had a failed transaction in 6 months of daily use.', rating: 5 },
  { name: 'Tunde Okafor', location: 'Port Harcourt', text: 'DStv renewal at midnight, processed in 10 seconds. Support team also responded within 2 minutes when I had a question.', rating: 5 },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

export default function LandingPage() {
  useDocumentTitle('Buy Data, Airtime, Cable TV & Pay Bills Instantly', 'One wallet for data, airtime, cable TV, electricity and exam PINs — delivered instantly across Nigeria. No subscriptions, no hidden fees.');
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-shb-navy via-shb-navy-2 to-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-shb-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-28 sm:pb-36 flex flex-col items-center text-center relative z-10">
          <motion.div {...fadeUp(0)} className="mb-5 sm:mb-6 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 text-shb-gold-soft rounded-full text-xs sm:text-sm font-bold border border-white/10 backdrop-blur-sm">
            <Zap size={14} fill="currentColor" />
            Nigeria's Premium Digital Services Platform
          </motion.div>

          <motion.h1 {...fadeUp(0.08)} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tighter text-white mb-4 sm:mb-6 max-w-4xl leading-[1.05] px-2 font-display">
            Every bill you pay,<span className="text-shb-gold"> one wallet</span>
          </motion.h1>

          <motion.p {...fadeUp(0.16)} className="text-base sm:text-lg lg:text-xl text-gray-300 max-w-2xl mb-8 sm:mb-10 leading-relaxed px-4">
            Data, airtime, cable TV, electricity and exam PINs \u2014 all delivered instantly from a single
            Paystack-secured wallet. No subscriptions, no hidden fees.
          </motion.p>

          <motion.div {...fadeUp(0.24)} className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md sm:max-w-none">
            <Link to="/signup" className="shb-btn-primary px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg flex items-center justify-center gap-2">
              Create Free Account <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 text-white border-2 border-white/15 rounded-xl text-base sm:text-lg font-bold hover:bg-white/10 transition-all flex items-center justify-center touch-manipulation backdrop-blur-sm">
              Sign In
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div {...fadeUp(0.32)} className="mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {TRUST_INDICATORS.map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm font-semibold">
                <t.icon size={15} className="text-shb-gold-soft" />
                {t.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating service showcase card, overlapping into next section */}
        <motion.div {...fadeUp(0.4)} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 mb-[-1px]">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            {SERVICES.map((s) => (
              <Link key={s.title} to={s.to} className="flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl hover:bg-shb-gold-soft/20 transition-colors group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-shb-gold-soft/50 text-shb-gold-dark mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <s.icon size={20} />
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-900">{s.title}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 hidden sm:block">{s.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section className="pt-24 sm:pt-28 pb-16 sm:pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((s, i) => (
              <motion.div key={s.label} {...fadeUp(i * 0.06)} className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-shb-navy font-display">{s.num}</p>
                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Networks Strip ─────────────────────────────────────── */}
      <section id="networks" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-black text-gray-400 uppercase tracking-widest mb-10">Supported Networks</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {NETWORKS.map((net, i) => (
              <motion.div key={net.id} {...fadeUp(i * 0.06)} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-4 ${net.bg} ${net.text}`}>
                  {net.name[0]}
                </div>
                <p className="font-bold text-gray-900">{net.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-14 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 font-display">
              Everything You Need
            </h2>
            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
              One platform. All services. Instant delivery. Zero stress.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} {...fadeUp((i % 3) * 0.08)} className="shb-card p-7 sm:p-8 hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-shb-gold-soft/50 text-shb-gold-dark">
                  <f.icon size={24} />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2 font-display">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Banner ─────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-20 bg-gradient-to-br from-shb-navy to-shb-navy-3">
        <motion.div {...fadeUp()} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <p className="text-shb-gold-soft font-bold uppercase tracking-widest text-xs mb-4">No subscription fees</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 font-display">Pay Only When You Buy</h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            No monthly charges. No hidden fees. Fund your wallet via Paystack and pay exactly what's shown at checkout.
          </p>
          <Link to="/pricing" className="inline-flex items-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-shb-navy rounded-2xl text-base sm:text-lg font-extrabold hover:bg-shb-gold-soft transition-all shadow-xl">
            See Full Pricing <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-14 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-display">Loved Across Nigeria</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} {...fadeUp(i * 0.1)} className="shb-card p-7 sm:p-8">
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={16} className="text-shb-gold fill-shb-gold" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-shb-navy font-bold text-sm bg-gradient-to-br from-shb-gold-soft to-shb-gold">
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <motion.div {...fadeUp()} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight font-display">
            Ready to simplify your bills?
          </h2>
          <p className="text-lg sm:text-xl text-gray-500 mb-10">
            Join thousands of Nigerians already managing data, airtime and bills on SescoHub.
          </p>
          <Link to="/signup" className="shb-btn-primary inline-flex items-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg">
            Create Free Account <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      <PublicFooter />
    </div>
  );
}
