import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { settings as settingsApi } from '../lib/api';

interface SupportSettingsContextType {
  supportEmail: string;
  whatsappNumber: string; // raw digits, e.g. "08140112803"
  /** Builds a wa.me link. Pass a short context string to prefill a more specific message. */
  getWhatsAppUrl: (context?: string) => string;
}

// Defaults mirror what was previously hardcoded across the app, so nothing
// breaks (or flashes empty) while the real values are still loading or if
// the request fails.
const DEFAULT_SUPPORT_EMAIL = 'support@sescohub.com';
const DEFAULT_WHATSAPP_NUMBER = '08140112803';

const SupportSettingsContext = createContext<SupportSettingsContextType | undefined>(undefined);

function buildWhatsAppUrl(whatsappNumber: string, context?: string) {
  const digits = whatsappNumber.replace(/\D/g, '');
  // Numbers are stored/typed as local Nigerian format (leading 0); wa.me
  // needs the international form without the leading 0.
  const international = digits.startsWith('234') ? digits : `234${digits.replace(/^0/, '')}`;
  const text = context
    ? `Hi SescoHub Support, I need help — ${context}`
    : 'Hello, I need help with my SescoHub account.';
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

/**
 * Fetches support contact settings (email + WhatsApp number) exactly once
 * per app load and shares them via context, so every customer-facing
 * component (floating button, footer, support/contact pages, receipts)
 * reads the same admin-configured values instead of each hardcoding its
 * own constant or firing its own duplicate request.
 */
export function SupportSettingsProvider({ children }: { children: ReactNode }) {
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await settingsApi.getSupport();
        if (cancelled) return;
        if (res.supportEmail) setSupportEmail(res.supportEmail);
        if (res.whatsappNumber) setWhatsappNumber(res.whatsappNumber);
      } catch {
        // Non-critical — defaults already cover this, no need to surface an error.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<SupportSettingsContextType>(() => ({
    supportEmail,
    whatsappNumber,
    getWhatsAppUrl: (context?: string) => buildWhatsAppUrl(whatsappNumber, context),
  }), [supportEmail, whatsappNumber]);

  return <SupportSettingsContext.Provider value={value}>{children}</SupportSettingsContext.Provider>;
}

export function useSupportSettings() {
  const ctx = useContext(SupportSettingsContext);
  if (!ctx) throw new Error('useSupportSettings must be used within a SupportSettingsProvider');
  return ctx;
}
