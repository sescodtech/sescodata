import PublicPageShell from '../../components/PublicPageShell';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account and using SescoHub, you agree to these Terms & Conditions. If you do not agree,
    please do not use the platform.`,
  },
  {
    title: '2. Account Registration',
    body: `You must provide accurate information when creating your account and keep your login credentials
    confidential. You are responsible for all activity under your account.`,
  },
  {
    title: '3. Wallet & Payments',
    body: `SescoHub operates on a prepaid wallet model. You fund your wallet via Paystack, and purchases are
    deducted from your wallet balance at the price displayed at checkout. There are no subscription fees \u2014 you
    only pay for what you buy.`,
  },
  {
    title: '4. Purchases & Delivery',
    body: `Once a purchase is confirmed, we attempt delivery automatically through our upstream providers. Most
    orders complete within seconds. You are responsible for entering correct recipient details (phone number,
    smartcard/IUC number, meter number) \u2014 we cannot reverse a transaction that has already been delivered to an
    incorrect recipient due to user error.`,
  },
  {
    title: '5. Failed Transactions & Refunds',
    body: `If a purchase cannot be delivered due to a provider issue, the amount is automatically refunded to your
    wallet and the transaction is marked as failed. Refunds are credited to your SescoHub wallet, not your original
    payment method, unless otherwise arranged with support.`,
  },
  {
    title: '6. Prohibited Use',
    body: `You agree not to use SescoHub for any unlawful purpose, to attempt to defraud the platform or other
    users, or to interfere with the platform's normal operation. We reserve the right to suspend accounts found in
    violation of these terms.`,
  },
  {
    title: '7. Service Availability',
    body: `We route purchases across multiple upstream providers to maximize reliability, but we do not guarantee
    uninterrupted service. Planned maintenance or provider-side outages may occasionally delay delivery; affected
    purchases are refunded automatically.`,
  },
  {
    title: '8. Limitation of Liability',
    body: `SescoHub is not liable for indirect or consequential losses arising from delayed or failed deliveries,
    beyond the refund of the affected transaction amount to your wallet.`,
  },
  {
    title: '9. Changes to These Terms',
    body: `We may revise these terms from time to time. Continued use of the platform after changes are posted
    constitutes acceptance of the revised terms.`,
  },
  {
    title: '10. Contact',
    body: `Questions about these terms can be sent to support@sescohub.com.`,
  },
];

export default function TermsPage() {
  useDocumentTitle('Terms & Conditions', 'The terms governing your use of the SescoHub platform.');
  return (
    <PublicPageShell eyebrow="Legal" title="Terms & Conditions" description={`Last updated: ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`}>
      <div className="max-w-3xl mx-auto space-y-10">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-extrabold text-gray-900 font-display mb-2">{s.title}</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
          </div>
        ))}
        <div className="pt-6 border-t border-gray-100 text-sm text-gray-500">
          Questions about these terms? Contact us at <a href="mailto:support@sescohub.com" className="text-shb-gold-dark font-bold hover:underline">support@sescohub.com</a>.
        </div>
      </div>
    </PublicPageShell>
  );
}
