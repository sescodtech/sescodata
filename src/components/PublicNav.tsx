import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Become an Agent', to: '/become-an-agent' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

export function PublicLogo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-shb-gold to-shb-gold-dark shadow-md" style={{ boxShadow: 'var(--shadow-gold)' }}>
        <span className="text-shb-navy font-extrabold text-lg sm:text-2xl leading-none font-display">S</span>
      </div>
      <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-gray-900 font-display">SescoHub</span>
    </Link>
  );
}

export default function PublicNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <nav className="sticky top-0 bg-white/80 backdrop-blur-lg z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <PublicLogo />

          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-gray-600">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn('hover:text-shb-gold-dark transition-colors', location.pathname === link.to && 'text-shb-navy font-bold')}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/login" className="px-5 py-2 rounded-xl hover:bg-gray-50 transition-colors">Login</Link>
            <Link to="/signup" className="shb-btn-primary px-5 py-2.5 text-sm">Get Started Free</Link>
          </div>

          <button className="lg:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 lg:hidden flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-10">
            <PublicLogo />
            <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu"><X size={28} /></button>
          </div>
          <nav className="flex flex-col gap-5 text-xl font-semibold text-gray-800">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setIsMenuOpen(false)}>{link.label}</Link>
            ))}
            <hr className="border-gray-100" />
            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-shb-gold-dark">Login</Link>
            <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="shb-btn-primary w-full text-center py-4 text-lg">
              Create Free Account
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
