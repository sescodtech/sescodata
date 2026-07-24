import { useState } from 'react';
import { Mail, Phone, MessageCircle, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import PublicPageShell from '../../components/PublicPageShell';
import { contact } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const CHANNELS = [
  { icon: Mail, title: 'Email', value: 'support@sescohub.com', href: 'mailto:support@sescohub.com' },
  { icon: Phone, title: 'Phone', value: '0814 011 2803', href: 'tel:08140112803' },
  { icon: MessageCircle, title: 'In-app Support', value: 'Chat with us after signing in', href: '/login' },
];

export default function ContactPage() {
  useDocumentTitle('Contact Us', 'Reach the SescoHub team for support, partnership inquiries, or general questions.');
  const [name, setName] = useState('');
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
      await contact.submit({ name, email, message });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicPageShell eyebrow="Contact" title="We're here to help" description="Reach out for support, partnership inquiries, or general questions.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        {CHANNELS.map((c) => (
          <a key={c.title} href={c.href} className="shb-card p-6 text-center hover:border-shb-gold border-2 border-transparent transition-all">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-shb-gold-soft/50 text-shb-gold-dark mx-auto mb-4">
              <c.icon size={22} />
            </div>
            <p className="font-bold text-gray-900">{c.title}</p>
            <p className="text-sm text-gray-500 mt-1">{c.value}</p>
          </a>
        ))}
      </div>

      <div className="shb-card p-5 sm:p-8 max-w-2xl mx-auto">
        <h2 className="text-xl font-extrabold text-gray-900 font-display mb-1">Send us a message</h2>
        <p className="text-sm text-gray-500 mb-6">We typically respond within a few hours.</p>

        {submitted ? (
          <div className="text-center py-10">
            <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
            <p className="font-bold text-gray-900">Message sent</p>
            <p className="text-sm text-gray-500 mt-1">We've received your message and a confirmation email is on its way.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={15} /> {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" placeholder="Your name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm" />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Your email" placeholder="Your email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm" />
            </div>
            <textarea required value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" placeholder="How can we help?" rows={5}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm resize-none" />
            <button type="submit" disabled={isSubmitting} className="shb-btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Message</>}
            </button>
          </form>
        )}
      </div>
    </PublicPageShell>
  );
}
