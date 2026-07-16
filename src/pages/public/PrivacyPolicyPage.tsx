import PublicPageShell from '../../components/PublicPageShell';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly \u2014 your name, email address, phone number, and password
    at sign-up. We also record transaction data (purchases, wallet funding, delivery status) needed to operate
    your account. We do not store your card or bank details; wallet funding is processed entirely by Paystack.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to create and secure your account, process purchases and wallet top-ups, deliver
    the products you buy (data, airtime, cable subscriptions, electricity tokens, exam PINs), send transaction
    confirmations, and provide customer support.`,
  },
  {
    title: '3. Third-Party Providers',
    body: `To fulfil purchases, we route requests through multiple upstream service providers behind the scenes.
    We do not share your identity with these providers beyond what's operationally required (e.g. a phone number
    for a data purchase, a meter number for an electricity token). Payments are processed by Paystack under their
    own privacy and security policies.`,
  },
  {
    title: '4. Data Security',
    body: `Passwords are hashed and never stored in plain text. Access to your account requires a valid session
    token. We take reasonable technical measures to protect your data, but no system is 100% secure, and we
    encourage you to use a strong, unique password.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain account and transaction data for as long as your account is active, and as needed to comply
    with legal, accounting, or dispute-resolution obligations.`,
  },
  {
    title: '6. Your Rights',
    body: `You can review and update your profile information at any time from Settings. To request account
    deletion or a copy of your data, contact support@sescohub.com.`,
  },
  {
    title: '7. Cookies',
    body: `We use essential cookies/local storage to keep you signed in and to remember lightweight preferences
    like recently used phone numbers or favorite plans. These are not used for third-party advertising \u2014 SescoHub
    products do not display ads.`,
  },
  {
    title: '8. Changes to This Policy',
    body: `We may update this policy from time to time. Material changes will be reflected here with an updated
    effective date.`,
  },
];

export default function PrivacyPolicyPage() {
  useDocumentTitle('Privacy Policy', 'How SescoHub collects, uses and protects your information.');
  return (
    <PublicPageShell eyebrow="Legal" title="Privacy Policy" description={`Last updated: ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`}>
      <div className="max-w-3xl mx-auto space-y-10">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-extrabold text-gray-900 font-display mb-2">{s.title}</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
          </div>
        ))}
        <div className="pt-6 border-t border-gray-100 text-sm text-gray-500">
          Questions about this policy? Contact us at <a href="mailto:support@sescohub.com" className="text-shb-gold-dark font-bold hover:underline">support@sescohub.com</a>.
        </div>
      </div>
    </PublicPageShell>
  );
}
