import { useState } from 'react';
import { MessageCircle, Headset } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Same phone number + WhatsApp URL pattern already used in SupportPage.tsx —
// kept identical rather than introducing a new source of truth or an extra
// API call just to render a floating button.
const SUPPORT_PHONE = '08140112803';
const WHATSAPP_URL = `https://wa.me/234${SUPPORT_PHONE.slice(1)}?text=${encodeURIComponent(
  'Hi SescoHub Support, I need help with my account.',
)}`;

/**
 * Global floating action buttons: WhatsApp (bottom-right, always) and a
 * Support shortcut stacked just above it. Rendered once at the app root so
 * it persists across every route without needing to be added page-by-page.
 *
 * Deliberately lightweight: no extra network requests, no heavy animation
 * library usage beyond plain CSS transitions, so it can't regress the perf
 * work done elsewhere in the app.
 */
export default function FloatingSupportButtons() {
  const [justOpened, setJustOpened] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on the payment callback page and on auth pages — a floating chat
  // bubble over a payment result or the login form is more distracting than
  // helpful, and matches how these buttons are typically scoped on similar
  // fintech products.
  const hideOn = ['/login', '/signup', '/payment/callback'];
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;

  const goToSupport = () => {
    // Logged-in customers go to the real support/ticket page; anonymous
    // visitors go to the public contact page instead, since /app/support
    // is behind auth and would just bounce them to /login.
    navigate(user ? '/app/support' : '/contact');
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] flex flex-col items-end gap-3">
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

      {/* WhatsApp button */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:brightness-95 transition-all duration-200 hover:-translate-y-0.5"
      >
        <MessageCircle size={26} />
      </a>
    </div>
  );
}

// Exported so failed-purchase flows (Priority 4) can link straight into a
// prefilled WhatsApp chat without duplicating the URL-building logic.
export function getSupportWhatsAppUrl(context?: string) {
  const text = context
    ? `Hi SescoHub Support, I need help — ${context}`
    : 'Hi SescoHub Support, I need help with my account.';
  return `https://wa.me/234${SUPPORT_PHONE.slice(1)}?text=${encodeURIComponent(text)}`;
}
