import { ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useApplyBranding } from './lib/theme';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Route-level code splitting: everything except the landing page and login
// (the two most likely first-paint routes) loads on demand. This is what
// brought the single >500KB main chunk warning down to a real fix instead
// of just raising the warning threshold.
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const PricingPage = lazy(() => import('./pages/public/PricingPage'));
const BecomeAgentPage = lazy(() => import('./pages/public/BecomeAgentPage'));
const FAQPage = lazy(() => import('./pages/public/FAQPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const BuyDataFlow = lazy(() => import('./pages/BuyDataFlow'));
const BuyAirtime = lazy(() => import('./pages/BuyAirtime'));
const UtilityBills = lazy(() => import('./pages/UtilityBills'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const APIPage = lazy(() => import('./pages/APIPage'));
const ExamPinsPage = lazy(() => import('./pages/ExamPinsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const KYCPage = lazy(() => import('./pages/KYCPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-shb-gold-dark" size={32} />
    </div>
  );
}

// ── Protected route ─────────────────────────────────────────
function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-shb-gold-dark" size={36} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  const roleStr = String(user.backendRole).toLowerCase();
  if (adminOnly && roleStr !== 'admin') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

// ── Payment callback page ───────────────────────────────────
function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const status = params.get('payment');
  const trxref = params.get('trxref') || params.get('reference');

  if (status === 'error' || status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-500" size={40} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Payment Issue</h1>
          <p className="text-gray-500 mb-8">Something went wrong with your payment. No funds were charged. Please try again.</p>
          <a href="/app/buy-data" className="shb-btn-primary block w-full text-center">
            Try Again
          </a>
          <a href="/app/transactions" className="block mt-3 text-sm text-gray-500 hover:underline">
            View transactions
          </a>
        </div>
      </div>
    );
  }

  // Success or unknown — assume success if there's a reference
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-green-500" size={40} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-500 mb-4">Your payment was received. Your order is being processed and will be delivered shortly.</p>
        {trxref && (
          <div className="bg-gray-50 rounded-xl p-4 mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Reference</p>
            <p className="font-mono text-sm text-gray-700 font-bold">{trxref}</p>
          </div>
        )}
        <a href="/app/transactions" className="shb-btn-primary block w-full text-center">
          View Transactions
        </a>
        <a href="/app" className="block mt-3 text-sm text-gray-500 hover:underline">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  useApplyBranding();
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/become-an-agent" element={<BecomeAgentPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Paystack callback — backend redirects here after payment */}
          <Route path="/payment/callback" element={<PaymentCallbackPage />} />

          {/* Protected dashboard routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="buy-data" element={<BuyDataFlow />} />
            <Route path="buy-airtime" element={<BuyAirtime />} />
            <Route path="tv" element={<UtilityBills />} />
            <Route path="electricity" element={<UtilityBills />} />
            <Route path="exam-pins" element={<ExamPinsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="verification" element={<KYCPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="api" element={<APIPage />} />

            {/* Admin-only route — single consolidated console (was two: tenant-admin + super-admin) */}
            <Route
              path="admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
