import { Link } from 'react-router-dom';
import { Twitter, Instagram, Facebook, Mail, Phone } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-shb-navy text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-10 pb-10 border-b border-white/10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-shb-gold to-shb-gold-dark">
                <span className="text-shb-navy font-extrabold text-xl font-display">S</span>
              </div>
              <span className="text-2xl font-extrabold font-display">SescoHub</span>
            </div>
            <p className="text-gray-400">Nigeria's premium digital services platform. Data, Airtime, Cable TV, Bills, Exam PINs.</p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-full bg-white/5 hover:bg-shb-gold hover:text-shb-navy flex items-center justify-center transition-colors"><Twitter size={16} /></a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/5 hover:bg-shb-gold hover:text-shb-navy flex items-center justify-center transition-colors"><Instagram size={16} /></a>
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/5 hover:bg-shb-gold hover:text-shb-navy flex items-center justify-center transition-colors"><Facebook size={16} /></a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
            <div className="flex flex-col gap-3">
              <p className="font-extrabold text-shb-gold-soft uppercase tracking-widest text-xs mb-1">Services</p>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Buy Data</Link>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Buy Airtime</Link>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Cable TV</Link>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Electricity</Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-extrabold text-shb-gold-soft uppercase tracking-widest text-xs mb-1">Company</p>
              <Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link>
              <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
              <Link to="/become-an-agent" className="text-gray-400 hover:text-white transition-colors">Become an Agent</Link>
              <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-extrabold text-shb-gold-soft uppercase tracking-widest text-xs mb-1">Support</p>
              <Link to="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link>
              <Link to="/app/support" className="text-gray-400 hover:text-white transition-colors">Help Center</Link>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link>
              <Link to="/signup" className="text-gray-400 hover:text-white transition-colors">Sign Up</Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-extrabold text-shb-gold-soft uppercase tracking-widest text-xs mb-1">Legal</p>
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} SescoHub Digital Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-6 text-gray-400 text-sm">
            <a href="mailto:support@sescohub.com" className="flex items-center gap-2 hover:text-white transition-colors"><Mail size={14} /> support@sescohub.com</a>
            <a href="tel:08140112803" className="flex items-center gap-2 hover:text-white transition-colors"><Phone size={14} /> 0814 011 2803</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
