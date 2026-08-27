import { Target, Users, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicPageShell from '../../components/PublicPageShell';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const VALUES = [
  { icon: Zap, title: 'Speed', desc: 'Every purchase is delivered automatically, in seconds — no manual approvals, no waiting in a queue.' },
  { icon: ShieldCheck, title: 'Reliability', desc: 'We fail over across multiple upstream suppliers behind the scenes, so a single outage never stops your purchase.' },
  { icon: Users, title: 'Fairness', desc: 'Transparent wallet balances, transparent pricing, and refunds issued automatically when a delivery fails.' },
  { icon: Target, title: 'Focus', desc: 'One platform, done well — data, airtime, cable TV, electricity, and exam PINs. Nothing you don\u2019t need.' },
];

export default function AboutPage() {
  useDocumentTitle('About Us', 'SescoHub is a premium digital services platform serving customers across Nigeria — data, airtime, cable TV, electricity and exam PINs from one wallet.');
  return (
    <PublicPageShell eyebrow="About Us" title="Built for how Nigerians actually pay bills" description="SescoHub started as a simple idea: buying data, airtime, and bills shouldn't involve queues, delays, or guesswork.">
      <div className="space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-gray-900 font-display">Our Story</h2>
            <p className="text-gray-600 leading-relaxed">
              SescoHub is a premium digital services platform serving customers across Nigeria. We built it around a
              single wallet: fund it once with Paystack, then buy mobile data, airtime, cable TV subscriptions,
              electricity tokens, and exam PINs instantly — without re-entering card details every time.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Behind the scenes, every purchase is routed through multiple upstream suppliers with automatic failover,
              so a single provider outage never means a failed transaction on your end. If something can't be
              delivered, your wallet is refunded automatically — no support ticket required.
            </p>
          </div>
          <div className="rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-shb-navy to-shb-navy-3 text-white shadow-xl">
            <p className="text-shb-gold-soft text-xs font-black uppercase tracking-widest mb-6">By the numbers</p>
            <div className="grid grid-cols-2 gap-6">
              {[
                ['4', 'Networks supported'],
                ['3', 'Cable TV providers'],
                ['6+', 'Discos covered'],
                ['24/7', 'Automated delivery'],
              ].map(([num, label]) => (
                <div key={label}>
                  <p className="text-3xl font-extrabold font-display">{num}</p>
                  <p className="text-gray-300 text-sm mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 font-display mb-8 text-center">What we stand for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="shb-card p-6 flex gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-shb-gold-soft/50 text-shb-gold-dark shrink-0">
                  <v.icon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{v.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center rounded-3xl bg-shb-gold-soft/20 border border-shb-gold-soft p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-display mb-3">Ready to get started?</h2>
          <p className="text-gray-600 mb-8">Create a free account and fund your wallet in under two minutes.</p>
          <Link to="/signup" className="shb-btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base">
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
}
