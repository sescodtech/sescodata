import {
  LayoutDashboard, Wallet, ReceiptText, ShoppingCart,
  Settings, ShieldCheck, LogOut, Menu, X, Zap,
  Tv, Smartphone, MessageSquare, GraduationCap, Bell, BadgeCheck,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const USER_LINKS = [
  { name: 'Dashboard',     to: '/app',              icon: LayoutDashboard, end: true },
  { name: 'Buy Data',      to: '/app/buy-data',     icon: ShoppingCart },
  { name: 'Buy Airtime',   to: '/app/buy-airtime',  icon: Smartphone },
  { name: 'TV / Cable',    to: '/app/tv',           icon: Tv },
  { name: 'Electricity',   to: '/app/electricity',  icon: Zap },
  { name: 'Exam PINs',     to: '/app/exam-pins',    icon: GraduationCap },
  { name: 'Notifications', to: '/app/notifications', icon: Bell },
  { name: 'Wallet',        to: '/app/wallet',       icon: Wallet },
  { name: 'Transactions',  to: '/app/transactions', icon: ReceiptText },
  { name: 'Support',       to: '/app/support',      icon: MessageSquare },
  { name: 'Verification',  to: '/app/verification', icon: BadgeCheck },
  { name: 'Settings',      to: '/app/settings',     icon: Settings },
];

// Single-tenant platform: one admin console, one extra link (was two: tenant-admin + super-admin).
const ADMIN_EXTRA = [
  { name: 'Admin Console', to: '/app/admin', icon: ShieldCheck },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-shb-gold to-shb-gold-dark shadow-md" style={{ boxShadow: 'var(--shadow-gold)' }}>
        <span className="text-shb-navy font-extrabold text-[15px] leading-none font-display">S</span>
      </div>
      <span className="font-display font-extrabold text-[15px] tracking-tight text-shb-navy">SescoHub</span>
    </div>
  );
}

function NavItem({ link, onClick }: { link: (typeof USER_LINKS)[0]; onClick?: () => void }) {
  return (
    <NavLink
      to={link.to}
      end={(link as any).end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-semibold rounded-lg transition-all touch-manipulation',
          isActive
            ? 'bg-shb-navy text-white shadow-md'
            : 'text-gray-500 hover:bg-gray-50 hover:text-shb-navy',
        )
      }
    >
      <link.icon size={16} />
      {link.name}
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Single-tenant platform: only 'admin' | 'customer' roles exist now.
  const isAdmin = String(user?.backendRole).toLowerCase() === 'admin';
  const links = [...(isAdmin ? ADMIN_EXTRA : []), ...USER_LINKS];
  const roleLabel = isAdmin ? '⚡ Admin' : 'Customer';

  const UserPill = ({ className }: { className?: string }) => (
    <div className={cn('p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2.5', className)}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-shb-navy text-[12.5px] font-extrabold shrink-0 bg-gradient-to-br from-shb-gold-soft to-shb-gold">
        {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[13px] text-gray-900 truncate">{user?.name}</p>
        <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest">{roleLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Mobile Top Bar ────────────────────────────────────── */}
      <header className="flex md:hidden items-center justify-between px-3.5 py-2.5 bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <Logo />
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── Mobile Drawer ─────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-64 bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <Logo />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-gray-400" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>

              <UserPill className="mx-3 mt-3" />

              <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {links.map((link) => (
                  <NavItem key={link.to} link={link} onClick={() => setIsMobileMenuOpen(false)} />
                ))}
              </nav>

              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 text-[13px] font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1">
        {/* ── Desktop Sidebar ───────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 fixed h-full z-30 shadow-sm">
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="mb-5">
              <Logo />
            </div>

            <UserPill className="mb-4" />

            <nav className="space-y-0.5">
              {links.map((link) => (
                <NavItem key={link.to} link={link} />
              ))}
            </nav>
          </div>

          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 text-[13px] font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────── */}
        <main className="flex-1 md:ml-56 min-h-screen">
          <div className="p-3.5 md:p-6 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
