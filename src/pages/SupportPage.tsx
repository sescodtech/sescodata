import { useState, useEffect } from 'react';
import { MessageCircle, Mail, Phone, HelpCircle, ChevronDown, Send, CheckCircle2, Search, AlertCircle, Loader2, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { support, formatDate, type SupportTicket } from '../lib/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const FAQS = [
  {
    q: 'How long does it take for data to be delivered?',
    a: 'Most data purchases are delivered within seconds of payment. If you experience a delay over 5 minutes, contact us with your transaction reference and we will resolve it immediately.',
  },
  {
    q: 'What happens if I enter the wrong phone number?',
    a: 'Once a transaction is processed and delivered, we cannot reverse it. Please always double-check your number before confirming.',
  },
  {
    q: 'Which networks are supported?',
    a: 'We support MTN, Airtel, Glo, and 9Mobile for data and airtime. For cable TV we support DStv, GOtv, and StarTimes. For electricity, 6+ Discos nationwide.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'All wallet funding is processed by Paystack. You can pay with debit/credit cards, USSD, or bank transfer.',
  },
  {
    q: 'I paid but my order was not delivered. What do I do?',
    a: 'Failed deliveries are automatically refunded to your wallet \u2014 check your Transactions page for the status. If you don\u2019t see a refund within a few minutes, send us your transaction reference via WhatsApp or email.',
  },
  {
    q: 'Can I get a refund?',
    a: 'If your order failed and was not delivered, it is refunded automatically to your wallet. Successful deliveries cannot be refunded as the value has already been sent.',
  },
];

const SUPPORT_PHONE = '08140112803';
const SUPPORT_EMAIL = 'support@sescohub.com';
const WHATSAPP_URL = `https://wa.me/234${SUPPORT_PHONE.slice(1)}?text=Hi%20SescoHub%20Support%2C%20I%20need%20help%20with%20my%20order.`;

const CHANNELS = [
  { href: WHATSAPP_URL, external: true, icon: MessageCircle, title: 'WhatsApp Chat', sub: 'Fastest way to reach us', value: SUPPORT_PHONE },
  { href: `mailto:${SUPPORT_EMAIL}`, icon: Mail, title: 'Email Support', sub: 'Response within a few hours', value: SUPPORT_EMAIL },
  { href: `tel:+234${SUPPORT_PHONE.slice(1)}`, icon: Phone, title: 'Phone Call', sub: 'Mon \u2013 Sun, 8AM \u2013 10PM', value: SUPPORT_PHONE },
];

export default function SupportPage() {
  useDocumentTitle('Support');
  useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await support.myTickets();
      setTickets(res.tickets);
    } catch {
      // fail silently — empty state covers it
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const filteredFaqs = FAQS.filter(
    (f) => !searchTerm || f.q.toLowerCase().includes(searchTerm.toLowerCase()) || f.a.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await support.createTicket(form);
      setSubmitted(true);
      setForm({ subject: '', message: '' });
      loadTickets();
    } catch (err: any) {
      setError(err.message || 'Failed to create support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 content-reveal pb-12">
      <PageHeader title="Support Center" description="We're here to help with any issue on your account." />

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CHANNELS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target={c.external ? '_blank' : undefined}
            rel={c.external ? 'noopener noreferrer' : undefined}
            className="shb-card p-6 flex flex-col items-center text-center group hover:border-shb-gold border-2 border-transparent transition-all"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform bg-shb-gold-soft/50 text-shb-gold-dark">
              <c.icon size={26} />
            </div>
            <h3 className="font-extrabold text-gray-900 mb-1">{c.title}</h3>
            <p className="text-xs text-gray-500 font-medium mb-3">{c.sub}</p>
            <span className="text-shb-navy font-bold text-sm">{c.value}</span>
          </a>
        ))}
      </div>

      {/* Quick WhatsApp CTA */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-5 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <MessageCircle size={20} />
          </div>
          <div>
            <p className="font-bold">Chat us on WhatsApp right now</p>
            <p className="text-green-100 text-sm">We typically reply within a few minutes</p>
          </div>
        </div>
        <Send size={20} className="group-hover:translate-x-1 transition-transform" />
      </a>

      {/* FAQ */}
      <div className="shb-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg font-display">
            <HelpCircle size={22} className="text-shb-gold-dark" />
            Frequently Asked Questions
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100 focus:ring-2 focus:ring-shb-gold transition-all"
            />
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <EmptyState icon={HelpCircle} title="No FAQs match your search" action={<button onClick={() => setSearchTerm('')} className="text-shb-gold-dark text-sm font-bold hover:underline">Clear search</button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredFaqs.map((faq, i) => (
              <div key={faq.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-800 text-sm pr-4">{faq.q}</span>
                  <ChevronDown size={18} className={cn('text-gray-400 shrink-0 transition-transform', openFaq === i && 'rotate-180 text-shb-gold-dark')} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-600 leading-relaxed bg-gray-50/50">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Form */}
      <div className="shb-card p-6 sm:p-8">
        <h3 className="font-extrabold text-gray-900 text-lg mb-2 font-display">Raise a Support Ticket</h3>
        <p className="text-gray-500 text-sm mb-6">Can't find your answer above? Open a ticket and we'll get back to you by email.</p>

        {submitted ? (
          <div className="flex flex-col items-center text-center py-8">
            <CheckCircle2 size={48} className="text-green-500 mb-4" />
            <h4 className="font-extrabold text-gray-900 mb-2">Ticket created</h4>
            <p className="text-gray-500 text-sm max-w-sm">We've emailed you a confirmation. For urgent issues, please use WhatsApp.</p>
            <button onClick={() => setSubmitted(false)} className="shb-btn-primary mt-6 px-6 py-2.5 text-sm">
              Raise Another Ticket
            </button>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={15} /> {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Subject</label>
              <input type="text" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief summary of your issue"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Message</label>
              <textarea required rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Describe your issue. Include your transaction reference if applicable..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold resize-none transition-all" />
            </div>
            <button type="submit" disabled={isSubmitting} className="shb-btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Send size={18} /> Raise Ticket</>}
            </button>
          </form>
        )}
      </div>

      {/* Ticket History */}
      <div className="shb-card overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <Ticket size={18} className="text-shb-gold-dark" />
          <h3 className="font-extrabold text-gray-900 font-display">Your Tickets</h3>
        </div>
        {isLoadingTickets ? (
          <SkeletonList rows={2} />
        ) : tickets.length === 0 ? (
          <EmptyState icon={Ticket} title="No support tickets yet" description="Tickets you raise will show up here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => (
              <div key={t._id} className="px-5 sm:px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.createdAt)}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border',
                    t.status === 'resolved' || t.status === 'closed' ? 'bg-green-50 text-green-700 border-green-200' :
                    t.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200',
                  )}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{t.message}</p>
                {t.replies.length > 0 && (
                  <p className="text-[11px] text-shb-gold-dark font-bold mt-2">{t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
