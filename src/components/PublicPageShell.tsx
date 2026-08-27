import { ReactNode } from 'react';
import { motion } from 'motion/react';
import PublicNav from './PublicNav';
import PublicFooter from './PublicFooter';

export default function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <section className="bg-gradient-to-b from-shb-navy to-shb-navy-2 text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {eyebrow && (
              <span className="inline-block px-3 py-1 bg-white/10 text-shb-gold-soft rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                {eyebrow}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display">{title}</h1>
            {description && <p className="text-gray-300 text-base sm:text-lg mt-4 max-w-2xl mx-auto">{description}</p>}
          </motion.div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}
