import { useState } from 'react';
import { TrendingUp, Wallet, Users, Headset, ArrowRight, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicPageShell from '../../components/PublicPageShell';
import { agent } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const BENEFITS = [
  { icon: TrendingUp, title: 'Resell at your own price', desc: 'Buy data, airtime and bills at our rates, then resell to your customers however you price it.' },
  { icon: Wallet, title: 'One wallet, every service', desc: 'No juggling multiple apps or SIMs \u2014 fund one wallet and serve every request from it.' },
  { icon: Users, title: 'Built for your customer base', desc: 'Whether you run a kiosk, a shop, or serve friends and family, the same account works for both.' },
  { icon: Headset, title: 'Priority support', desc: 'Agent applicants get a dedicated line for delivery issues and account questions.' },
];

export default function BecomeAgentPage() {
  useDocumentTitle('Become an Agent', 'Turn your shop into a digital services point — sell data, airtime, cable TV and electricity using one SescoHub wallet.');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await agent.apply({ name, phone, email, message });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicPageShell eyebrow="Become an Agent" title="Turn your shop into a digital services point" description="Sell data, airtime, cable TV and electricity to your customers using one SescoHub wallet.">
      <div className="space-y-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="shb-card p-6 flex gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-shb-gold-soft/50 text-shb-gold-dark shrink-0">
                <b.icon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{b.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-gray-900 font-display">How it works</h2>
            <ol className="space-y-4">
              {[
                ['Create a free account', 'Sign up in under two minutes \u2014 no paperwork needed to get started.'],
                ['Fund your wallet', 'Top up via Paystack whenever you need more balance.'],
                ['Serve your customers', 'Buy data, airtime, cable and electricity for them at your own margin.'],
              ].map(([title, desc], i) => (
                <li key={title} className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-shb-navy text-white flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</span>
                  <div>
                    <p className="font-bold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link to="/signup" className="shb-btn-secondary inline-flex items-center gap-2 mt-2">
              Create Free Account <ArrowRight size={16} />
            </Link>
          </div>

          <div className="shb-card p-6 sm:p-8">
            <h3 className="font-extrabold text-gray-900 mb-1">Want a dedicated agent line?</h3>
            <p className="text-sm text-gray-500 mb-6">Tell us a bit about your business and we'll reach out.</p>

            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                <p className="font-bold text-gray-900">Application received</p>
                <p className="text-sm text-gray-500 mt-1">Check your email for confirmation \u2014 our team will be in touch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle size={15} /> {error}
                  </div>
                )}
                <input required value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" placeholder="Full name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm" />
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone number" placeholder="Phone number"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" placeholder="Email address"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm" />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Tell us about your business (optional)" placeholder="Tell us about your business (optional)" rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm resize-none" />
                <button type="submit" disabled={isSubmitting} className="shb-btn-primary w-full flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Application</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
}
