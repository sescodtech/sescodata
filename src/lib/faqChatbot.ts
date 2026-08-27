// Static, predefined Q&A for the floating FAQ chatbot. No AI, no external
// API, no database — just a fixed lookup table rendered client-side.
export interface FaqChatbotEntry {
  q: string;
  a: string;
}

export const FAQ_CHATBOT_ENTRIES: FaqChatbotEntry[] = [
  {
    q: 'How do I buy data?',
    a: 'Go to Buy Data from your dashboard, choose your network, pick a plan, enter the phone number, and confirm. Data is delivered within seconds of payment.',
  },
  {
    q: 'How do I fund my wallet?',
    a: 'Go to Wallet and select Fund Wallet. You can pay by card, USSD, or bank transfer via Paystack — your balance updates as soon as payment is confirmed.',
  },
  {
    q: 'My transaction failed.',
    a: 'Failed transactions are automatically refunded to your wallet. Check your Transactions page for the status — if you don\u2019t see a refund shortly, contact support with your transaction reference.',
  },
  {
    q: 'I forgot my password.',
    a: 'On the login page, tap "Forgot password" and follow the reset link sent to your registered email.',
  },
  {
    q: 'How do I contact support?',
    a: 'Use the WhatsApp button for the fastest reply, or open Support from your dashboard to send a ticket. You can also email us — see the Support page for the current address.',
  },
  {
    q: 'How do I verify my account?',
    a: 'Go to Settings and complete your KYC verification with the required details. Verification helps unlock higher transaction limits.',
  },
];
