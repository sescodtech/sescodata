import { useState } from 'react';
import { Terminal, Shield, Key, Copy, Check, ExternalLink, Zap, Database } from 'lucide-react';
import { cn } from '../lib/utils';

export default function APIPage() {
  const [copied, setCopied] = useState(false);
  const apiKey = "YOUR_STRIPE_KEY_HERE";

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endpoints = [
    { method: 'POST', path: '/api/v1/buy-data', desc: 'Initiate a mobile data purchase.', auth: 'Required' },
    { method: 'GET', path: '/api/v1/wallet/balance', desc: 'Retrieve current wallet balance.', auth: 'Required' },
    { method: 'GET', path: '/api/v1/transactions', desc: 'List all transaction history.', auth: 'Required' },
    { method: 'POST', path: '/api/v1/query-tx', desc: 'Check status of a specific transaction.', auth: 'Required' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Developer API</h1>
          <p className="text-gray-500 text-sm">Automate your VTU business with our robust API suite.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100">
              <ExternalLink size={16} /> API Docs
           </button>
        </div>
      </header>

      {/* API Key Card */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
               <Key size={20} />
            </div>
            <div>
               <h3 className="font-bold text-gray-900">Your API Secret Key</h3>
               <p className="text-xs text-gray-400 font-medium">Keep this key secret and secure.</p>
            </div>
         </div>

         <div className="relative group">
            <input 
               type="text" 
               readOnly 
               value={apiKey} 
               className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-mono text-sm text-gray-800 outline-none transition-all pr-24"
            />
            <button 
               onClick={handleCopy}
               className="absolute right-2 top-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-blue-600 shadow-sm border border-gray-100 hover:bg-gray-50 transition-all flex items-center gap-2"
            >
               {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
               {copied ? 'Copied' : 'Copy'}
            </button>
         </div>

         <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
               <div className="flex items-center gap-2 text-orange-800 mb-1">
                  <Shield size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">White-label API</span>
               </div>
               <p className="text-xs text-orange-700 font-medium">Your users see your branding in transaction SMS/Emails.</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
               <div className="flex items-center gap-2 text-indigo-800 mb-1">
                  <Zap size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Fast Execution</span>
               </div>
               <p className="text-xs text-indigo-700 font-medium">Average transaction delivery time is under 1.5 seconds.</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
               <div className="flex items-center gap-2 text-green-800 mb-1">
                  <Database size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Webhooks</span>
               </div>
               <p className="text-xs text-green-700 font-medium">Receive real-time push notifications for transaction updates.</p>
            </div>
         </div>
      </div>

      {/* Endpoints Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
               <Terminal size={20} className="text-blue-600" />
               API Endpoints
            </h3>
            <span className="text-xs font-bold text-gray-400">v1.2.0 Stable</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                     <th className="px-8 py-4">Method</th>
                     <th className="px-8 py-4">Endpoint</th>
                     <th className="px-8 py-4">Auth</th>
                     <th className="px-8 py-4">Description</th>
                  </tr>
               </thead>
               <tbody className="text-sm">
                  {endpoints.map(ep => (
                     <tr key={ep.path} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <td className="px-8 py-5">
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black tracking-widest",
                              ep.method === 'POST' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                           )}>{ep.method}</span>
                        </td>
                        <td className="px-8 py-5 font-mono text-xs text-gray-600 font-bold group-hover:text-blue-600 transition-colors">{ep.path}</td>
                        <td className="px-8 py-5 text-gray-400 text-[10px] font-bold uppercase tracking-widest">{ep.auth}</td>
                        <td className="px-8 py-5 text-gray-500 font-medium text-xs">{ep.desc}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <div className="p-8 bg-gray-50/50 border-t border-gray-100">
            <div className="bg-gray-900 rounded-2xl p-6 relative overflow-hidden group shadow-xl">
               <div className="flex justify-between items-center mb-4 text-white">
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Request Example (Node.js)</p>
                  <Copy size={16} className="text-gray-500 hover:text-white cursor-pointer" />
               </div>
               <pre className="text-xs font-mono text-blue-300 overflow-x-auto">
{`const response = await fetch('https://api.sescohubs.com/v1/buy-data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    network: 'mtn',
    plan: '500mb',
    recipient: '08012345678'
  })
});`}
               </pre>
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            </div>
         </div>
      </div>
    </div>
  );
}
