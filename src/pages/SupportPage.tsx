import { useState, useEffect } from 'react';
import { MessageCircle, Mail, Phone, HelpCircle, ChevronDown, Send, CheckCircle2, Search, AlertCircle, Loader2, Ticket, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { support, formatDate, type SupportTicket } from '../lib/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Drawer from '../components/Drawer';
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

/** Chat-style thread for a single ticket — customer messages on the left, admin replies on the right, matching the admin Support Center's conversation view. */
function TicketConversationDrawer({ ticketId, onClose, onUpdated }: { ticketId: string | null; onClose: () => void; onUpdated: () => void }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!ticketId) return;
    setLoading(true);
    support.getTicket(ticketId)
      .then((res) => setTicket(res.ticket))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ticketId]);

  const handleSend = async () => {
    if (!ticketId || !msg.trim()) return;
    setSending(true);
    try {
      const res = await support.reply(ticketId, msg);
      setTicket(res.ticket);
      setMsg('');
      onUpdated();
    } catch {
      /* best-effort — the textarea keeps the draft so the user can retry */
    } finally {
      setSending(false);
    }
  };

  const messages = ticket ? [...ticket.replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

  return (
    <Drawer open={!!ticketId} onClose={onClose} title={ticket?.subject || 'Ticket'}>
      {loading || !ticket ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="flex flex-col h-full">
          <span className={cn(
            'w-fit px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border mb-4',
            ticket.status === 'resolved' || ticket.status === 'closed' ? 'bg-green-50 text-green-700 border-green-200' :
            ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-blue-50 text-blue-700 border-blue-200',
          )}>
            {ticket.status.replace('_', ' ')}
          </span>

          <div className="flex-1 space-y-3 mb-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-shb-gold-soft/50 rounded-2xl rounded-tr-sm px-4 py-2.5">
                <p className="text-xs text-gray-800 whitespace-pre-line">{ticket.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">You · {formatDate(ticket.createdAt)}</p>
              </div>
            </div>
            {messages.map((r, i) => (
              <div key={i} className={cn('flex', r.from === 'admin' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5',
                  r.from === 'admin' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-shb-gold-soft/50 text-gray-800 rounded-tr-sm'
                )}>
                  <p className="text-xs whitespace-pre-line">{r.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{r.from === 'admin' ? (r.adminName || 'Support Team') : 'You'} · {formatDate(r.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-end gap-2 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
            <textarea
              value={msg} onChange={(e) => setMsg(e.target.value)}
              placeholder="Type a reply…" rows={2}
              className="flex-1 text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 resize-none outline-none focus:border-shb-gold"
            />
            <button
              onClick={handleSend}
              disabled={sending || !msg.trim()}
              className="w-10 h-10 rounded-xl bg-shb-navy hover:opacity-90 text-white flex items-center justify-center transition-opacity disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

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
  const [ticketsError, setTicketsError] = useState('');
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    setTicketsError('');
    try {
      const res = await support.myTickets();
      setTickets(res.tickets);
    } catch {
      setTicketsError('Could not load your tickets right now.');
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
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6 content-reveal pb-12">
      <PageHeader title="Support Center" description="We're here to help with any issue on your account." />

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CHANNELS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target={c.external ? '_blank' : undefined}
            rel={c.external ? 'noopener noreferrer' : undefined}
            className="shb-card-sm !p-5 flex flex-col items-center text-center group hover:border-shb-gold border-2 border-transparent transition-all duration-200 active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 bg-shb-gold-soft/50 text-shb-gold-dark">
              <c.icon size={22} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">{c.title}</h3>
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
          <h3 className="shb-section-title flex items-center gap-2 text-base">
            <HelpCircle size={18} className="text-shb-gold-dark" />
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
      <div className="shb-card p-4 sm:p-5">
        <h3 className="shb-section-title mb-1.5">Raise a Support Ticket</h3>
        <p className="text-gray-500 text-sm mb-5">Can't find your answer above? Open a ticket and we'll get back to you by email.</p>

        {submitted ? (
          <div className="flex flex-col items-center text-center py-6">
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
            <Input
              label="Subject" required value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Brief summary of your issue"
            />
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 block">Message</label>
              <textarea required rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Describe your issue. Include your transaction reference if applicable..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-transparent resize-none transition-all"
                style={{ boxShadow: 'none' }}
                onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-shb-gold)'}
                onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
              />
            </div>
            <Button type="submit" loading={isSubmitting} fullWidth icon={!isSubmitting ? <Send size={17} /> : undefined}>
              {isSubmitting ? 'Submitting…' : 'Raise Ticket'}
            </Button>
          </form>
        )}
      </div>

      {/* Ticket History */}
      <div className="shb-card overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-50 flex items-center gap-2">
          <Ticket size={16} className="text-shb-gold-dark" />
          <h3 className="shb-section-title">Your Tickets</h3>
        </div>
        {isLoadingTickets ? (
          <SkeletonList rows={2} />
        ) : ticketsError ? (
          <EmptyState icon={AlertCircle} variant="error" title={ticketsError} action={<Button size="sm" onClick={loadTickets} className="mt-1">Try again</Button>} />
        ) : tickets.length === 0 ? (
          <EmptyState icon={Ticket} title="No support tickets yet" description="Tickets you raise will show up here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => (
              <button key={t._id} onClick={() => setOpenTicketId(t._id)} className="w-full text-left px-4 sm:px-5 py-3 hover:bg-gray-50 transition-colors">
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
                  <p className="text-[11px] text-shb-gold-dark font-bold mt-2 flex items-center gap-1"><MessageSquare size={11} /> {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <TicketConversationDrawer ticketId={openTicketId} onClose={() => setOpenTicketId(null)} onUpdated={loadTickets} />
    </div>
  );
}
