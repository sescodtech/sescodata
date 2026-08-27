import { useState, useEffect, useMemo } from 'react';
import { MessageCircle, Mail, Phone, HelpCircle, ChevronDown, Send, CheckCircle2, Search, AlertCircle, Loader2, Ticket, MessageSquare, Clock3 } from 'lucide-react';
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
import { useSupportSettings } from '../context/SupportSettingsContext';

const FAQS = [
  { q: 'How long does it take for data to be delivered?', a: 'Most data purchases are delivered within seconds of payment. If you experience a delay over 5 minutes, contact us with your transaction reference and we will resolve it immediately.' },
  { q: 'What happens if I enter the wrong phone number?', a: 'Once a transaction is processed and delivered, we cannot reverse it. Please always double-check your number before confirming.' },
  { q: 'Which networks are supported?', a: 'We support MTN, Airtel, Glo, and 9Mobile for data and airtime. For cable TV we support DStv, GOtv, and StarTimes. For electricity, 6+ Discos nationwide.' },
  { q: 'What payment methods are accepted?', a: 'All wallet funding is processed by Paystack. You can pay with debit/credit cards, USSD, or bank transfer.' },
  { q: 'I paid but my order was not delivered. What do I do?', a: 'Failed deliveries are automatically refunded to your wallet — check your Transactions page for the status. If you don\u2019t see a refund within a few minutes, send us your transaction reference via WhatsApp or email.' },
  { q: 'Can I get a refund?', a: 'If your order failed and was not delivered, it is refunded automatically to your wallet. Successful deliveries cannot be refunded as the value has already been sent.' },
];

/** Chat-style thread — customer messages right, admin replies left. */
function TicketConversationDrawer({ ticketId, onClose, onUpdated }: { ticketId: string | null; onClose: () => void; onUpdated: () => void }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!ticketId) return;
    setLoading(true);
    support.getTicket(ticketId).then((res) => setTicket(res.ticket)).catch(() => {}).finally(() => setLoading(false));
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
    } catch { /* keep draft so the user can retry */ }
    finally { setSending(false); }
  };

  const messages = ticket ? [...ticket.replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

  return (
    <Drawer open={!!ticketId} onClose={onClose} title={ticket?.subject || 'Ticket'}>
      {loading || !ticket ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="flex flex-col h-full">
          <span className={cn(
            'w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border mb-3',
            ticket.status === 'resolved' || ticket.status === 'closed' ? 'bg-green-50 text-green-700 border-green-200' :
            ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-blue-50 text-blue-700 border-blue-200',
          )}>
            {ticket.status.replace('_', ' ')}
          </span>

          <div className="flex-1 space-y-2 mb-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-shb-gold-soft/50 rounded-lg rounded-tr-sm px-3 py-2">
                <p className="text-[12px] text-gray-800 whitespace-pre-line">{ticket.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">You · {formatDate(ticket.createdAt)}</p>
              </div>
            </div>
            {messages.map((r, i) => (
              <div key={i} className={cn('flex', r.from === 'admin' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[85%] rounded-lg px-3 py-2', r.from === 'admin' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-shb-gold-soft/50 text-gray-800 rounded-tr-sm')}>
                  <p className="text-[12px] whitespace-pre-line">{r.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{r.from === 'admin' ? (r.adminName || 'Support Team') : 'You'} · {formatDate(r.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-end gap-1.5 pt-2.5 border-t border-gray-100 sticky bottom-0 bg-white">
            <textarea
              value={msg} onChange={(e) => setMsg(e.target.value)}
              placeholder="Type a reply…" rows={2}
              className="flex-1 text-[12px] font-medium border border-gray-200 rounded-lg px-2.5 py-2 resize-none outline-none focus:border-shb-gold"
            />
            <button
              onClick={handleSend}
              disabled={sending || !msg.trim()}
              className="w-9 h-9 rounded-lg bg-shb-navy hover:opacity-90 text-white flex items-center justify-center transition-opacity disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
  const { supportEmail, whatsappNumber, getWhatsAppUrl } = useSupportSettings();
  const digits = whatsappNumber.replace(/\D/g, '');
  const international = digits.startsWith('234') ? digits : `234${digits.replace(/^0/, '')}`;
  const CHANNELS = [
    { href: getWhatsAppUrl('my order'), external: true, icon: MessageCircle, title: 'WhatsApp', sub: 'Fastest reply' },
    { href: `mailto:${supportEmail}`, icon: Mail, title: 'Email', sub: 'A few hours' },
    { href: `tel:+${international}`, icon: Phone, title: 'Call', sub: '8AM–10PM' },
  ];
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
  const [showForm, setShowForm] = useState(false);

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

  const summary = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
    const resolved = tickets.length - open;
    return { open, resolved, total: tickets.length };
  }, [tickets]);

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
    <div className="max-w-3xl mx-auto space-y-3 content-reveal pb-8 px-3.5 sm:px-0">
      <PageHeader
        title="Support"
        description="We're here to help with any issue."
        actions={<Button size="sm" onClick={() => setShowForm(true)}>New Ticket</Button>}
      />

      {/* Ticket summary strip — up top per spec */}
      <div className="grid grid-cols-3 gap-2">
        <div className="shb-card p-2.5 text-center">
          <p className="text-[16px] font-extrabold text-shb-navy leading-none">{summary.total}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Total</p>
        </div>
        <div className="shb-card p-2.5 text-center">
          <p className="text-[16px] font-extrabold text-amber-600 leading-none">{summary.open}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Open</p>
        </div>
        <div className="shb-card p-2.5 text-center">
          <p className="text-[16px] font-extrabold text-green-600 leading-none">{summary.resolved}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Resolved</p>
        </div>
      </div>

      {/* Contact channels — compact row tiles */}
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target={c.external ? '_blank' : undefined}
            rel={c.external ? 'noopener noreferrer' : undefined}
            className="shb-card-sm flex flex-col items-center text-center gap-1 hover:border-shb-gold border border-transparent transition-all active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-shb-gold-soft/50 text-shb-gold-dark">
              <c.icon size={15} />
            </div>
            <p className="font-bold text-gray-900 text-[12px]">{c.title}</p>
            <p className="text-[10px] text-gray-500">{c.sub}</p>
          </a>
        ))}
      </div>

      {/* Ticket history */}
      <div className="shb-card overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-50 flex items-center gap-1.5">
          <Ticket size={13} className="text-shb-gold-dark" />
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
              <button key={t._id} onClick={() => setOpenTicketId(t._id)} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-[12.5px] truncate">{t.subject}</p>
                    <p className="text-[10.5px] text-gray-400 mt-0.5 flex items-center gap-1"><Clock3 size={9} /> {formatDate(t.createdAt)}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wide border',
                    t.status === 'resolved' || t.status === 'closed' ? 'bg-green-50 text-green-700 border-green-200' :
                    t.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200',
                  )}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11.5px] text-gray-500 mt-1.5 line-clamp-1">{t.message}</p>
                {t.replies.length > 0 && (
                  <p className="text-[10.5px] text-shb-gold-dark font-bold mt-1 flex items-center gap-1"><MessageSquare size={10} /> {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="shb-card overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
          <h3 className="shb-section-title flex items-center gap-1.5">
            <HelpCircle size={14} className="text-shb-gold-dark" />
            FAQs
          </h3>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text" placeholder="Search FAQs…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 rounded-lg text-[12.5px] outline-none border border-gray-100 focus:ring-2 focus:ring-shb-gold transition-all"
            />
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <EmptyState icon={HelpCircle} title="No FAQs match your search" action={<button onClick={() => setSearchTerm('')} className="text-shb-gold-dark text-[12.5px] font-bold hover:underline">Clear search</button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredFaqs.map((faq, i) => (
              <div key={faq.q}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-800 text-[12.5px] pr-3">{faq.q}</span>
                  <ChevronDown size={15} className={cn('text-gray-400 shrink-0 transition-transform', openFaq === i && 'rotate-180 text-shb-gold-dark')} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="px-3 pb-3.5 text-[12.5px] text-gray-600 leading-relaxed bg-gray-50/50">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New ticket — sheet triggered from header button instead of an always-open form */}
      <Drawer open={showForm} onClose={() => { setShowForm(false); setSubmitted(false); }} title="Raise a Support Ticket">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-6">
            <CheckCircle2 size={36} className="text-green-500 mb-3" />
            <h4 className="font-extrabold text-gray-900 mb-1.5 text-[14px]">Ticket created</h4>
            <p className="text-gray-500 text-[12.5px] max-w-xs">We've emailed you a confirmation. For urgent issues, please use WhatsApp.</p>
            <button onClick={() => setSubmitted(false)} className="shb-btn-primary mt-4 px-4 text-[12.5px]">Raise Another</button>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-[12px] text-red-700">
                <AlertCircle size={13} /> {error}
              </div>
            )}
            <Input label="Subject" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your issue" />
            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-gray-600 block">Message</label>
              <textarea required rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Describe your issue. Include your transaction reference if applicable…"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-transparent resize-none transition-all text-[13px]"
                style={{ boxShadow: 'none' }}
                onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-shb-gold)'}
                onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
              />
            </div>
            <Button type="submit" loading={isSubmitting} fullWidth icon={!isSubmitting ? <Send size={14} /> : undefined}>
              {isSubmitting ? 'Submitting…' : 'Raise Ticket'}
            </Button>
          </form>
        )}
      </Drawer>

      <TicketConversationDrawer ticketId={openTicketId} onClose={() => setOpenTicketId(null)} onUpdated={loadTickets} />
    </div>
  );
}
