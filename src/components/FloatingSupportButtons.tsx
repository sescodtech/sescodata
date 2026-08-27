import { useState } from 'react';
import { MessageCircle, Headset } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useSupportSettings } from '../context/SupportSettingsContext';
import FAQChatbot from './FAQChatbot';

/**
 * Global floating action buttons: WhatsApp (bottom-right, always) and a
 * Support shortcut stacked just above it. Rendered once at the app root so
 * it persists across every route without needing to be added page-by-page.
 *
 * The WhatsApp number and message come from SupportSettingsContext (backed
 * by Admin Settings), not a hardcoded constant — an admin can update the
 * number once and every customer-facing surface picks it up automatically.
 *
 * Deliberately lightweight: no extra network requests of its own (the
 * context fetches once, app-wide), no heavy animation library usage beyond
 * plain CSS transitions, so it can't regress the perf work done elsewhere.
 */
export default function FloatingSupportButtons() {
  const [justOpened, setJustOpened] = useState(false);
  const { user } = useAuth();
  const { getWhatsAppUrl } = useSupportSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on the payment callback page and on auth pages — a floating chat
  // bubble over a payment result or the login form is more distracting than
  // helpful, and matches how these buttons are typically scoped on similar
  // fintech products.
  const hideOn = ['/login', '/signup', '/payment/callback'];
  const hasStickyPurchaseBar = location.pathname === '/app/buy-data';
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;

  const goToSupport = () => {
    // Logged-in customers go to the real support/ticket page; anonymous
    // visitors go to the public contact page instead, since /app/support
    // is behind auth and would just bounce them to /login.
    navigate(user ? '/app/support' : '/contact');
  };

  return (
    <div className={cn('fixed right-3 sm:right-6 z-[60] flex flex-col items-end gap-2.5 sm:gap-3', hasStickyPurchaseBar ? 'bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:bottom-6' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-6')}>
      {/* Support shortcut — sits above the WhatsApp button */}
      <button
        onClick={goToSupport}
        onMouseEnter={() => setJustOpened(true)}
        onMouseLeave={() => setJustOpened(false)}
        aria-label="Contact support"
        className="group flex items-center gap-2 bg-shb-navy text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 pl-3 pr-3 py-3 sm:pr-4"
      >
        <Headset size={20} className="shrink-0" />
        <span
          className={
            'text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-200 ' +
            (justOpened ? 'max-w-[120px] opacity-100 ml-0.5' : 'max-w-0 opacity-0 sm:max-w-0')
          }
        >
          Support
        </span>
      </button>

      {/* FAQ chatbot + WhatsApp button, side by side */}
      <div className="flex items-end gap-3">
        <FAQChatbot />
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:brightness-95 transition-all duration-200 hover:-translate-y-0.5"
        >
          <MessageCircle size={26} />
        </a>
      </div>
    </div>
  );
}
