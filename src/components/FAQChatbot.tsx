import { useState } from 'react';
import { MessageSquareText, X, ChevronDown } from 'lucide-react';
import { FAQ_CHATBOT_ENTRIES } from '../lib/faqChatbot';

/**
 * Floating FAQ chatbot: predefined questions only, answered from a static
 * local lookup table (lib/faqChatbot.ts). No AI, no external API calls, no
 * database, no uploads — purely client-side state that resets on refresh.
 * Sits beside the WhatsApp button in FloatingSupportButtons.
 */
export default function FAQChatbot() {
  const [open, setOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (i: number) => setOpenIndex((cur) => (cur === i ? null : i));

  return (
    <div className="relative">
      {open && (
        <div className="absolute bottom-[calc(100%+12px)] right-0 w-72 sm:w-80 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-shb-navy text-white shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquareText size={16} />
              <span className="text-sm font-bold">Quick Help</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close FAQ chat" className="text-white/70 hover:text-white p-0.5">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto p-2">
            {FAQ_CHATBOT_ENTRIES.map((entry, i) => (
              <div key={entry.q} className="border-b border-gray-50 last:border-b-0">
                <button
                  onClick={() => toggleQuestion(i)}
                  className="w-full flex items-center justify-between gap-2 text-left px-2 py-2.5 text-[13px] font-semibold text-gray-800 hover:text-shb-gold-dark transition-colors"
                >
                  <span>{entry.q}</span>
                  <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
                </button>
                {openIndex === i && (
                  <p className="px-2 pb-2.5 text-[12.5px] text-gray-500 leading-relaxed">{entry.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close FAQ chat' : 'Open FAQ chat'}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-shb-navy text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
      >
        {open ? <X size={24} /> : <MessageSquareText size={24} />}
      </button>
    </div>
  );
}
