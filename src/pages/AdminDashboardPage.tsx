import { useState, useEffect } from 'react';
import {
  Users, LayoutDashboard, DollarSign, AlertTriangle, Building2, Search,
  UserPlus, CheckCircle2, XCircle, UserCog, Smartphone, Tv, Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { admin } from '../lib/api';
import { toast } from 'sonner';
import AdminOverview from '../components/admin/AdminOverview';

interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  walletBalance: number;
  status: 'active' | 'suspended';
  role: string;
  lastLogin?: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'PRICING'>('OVERVIEW');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [markup, setMarkup] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  async function initializeData() {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchMarkup()
      ]);
    } catch (e: any) {
      toast.error('Failed to initialize admin data');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUsers() {
    const data = await admin.users();
    setUsers(data.users || []);
  }

  async function fetchMarkup() {
    const data = await admin.getMarkup();
    setMarkup(data.markup || {});
  }

  async function handleUpdateUserStatus(userId: string, status: string) {
    try {
      await admin.updateUserStatus(userId, status);
      toast.success(`User ${status === 'active' ? 'activated' : 'suspended'}`);
      await fetchUsers();
    } catch (e: any) {
      toast.error(`Failed to update status: ${e.message}`);
    }
  }

  async function handleUpdateMarkup(category: string, value: number) {
    try {
      const newMarkup = { ...markup, [category]: value };
      await admin.setMarkup(newMarkup);
      setMarkup(newMarkup);
      toast.success(`Updated ${category} markup`);
    } catch (e: any) {
      toast.error(`Markup update failed: ${e.message}`);
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u._id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-shb-navy shadow-xl bg-gradient-to-br from-shb-gold-soft to-shb-gold" style={{ boxShadow: 'var(--shadow-gold)' }}>
              <Building2 size={24} />
           </div>
           <div className="flex flex-col">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">Business Control Center</h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">SescoHub Admin Console</p>
           </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
           {['OVERVIEW', 'USERS', 'PRICING'].map((tab) => (
              <button
                 key={tab}
                 onClick={() => setActiveTab(tab as any)}
                 className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab ? "bg-white text-shb-navy shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-900"
                 )}
              >
                 {tab === 'OVERVIEW' && <LayoutDashboard size={14} />}
                 {tab === 'USERS' && <Users size={14} />}
                 {tab === 'PRICING' && <DollarSign size={14} />}
                 {tab}
              </button>
           ))}
        </div>
      </header>

      {activeTab === 'OVERVIEW' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <AdminOverview />
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input
                   type="text"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   placeholder="Search names, emails, or roles..."
                   className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-red-100 transition-all font-medium text-sm shadow-sm"
                 />
              </div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                 <UserPlus size={18} /> Invite User
              </button>
           </div>

           {selectedUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gray-900 rounded-2xl flex items-center justify-between shadow-2xl"
              >
                 <div className="flex items-center gap-3">
                    <span className="text-white text-xs font-black uppercase tracking-widest px-3 py-1 bg-white/10 rounded-lg">
                       {selectedUsers.length} Selected
                    </span>
                 </div>
                 <div className="flex gap-2">
                    <button
                      onClick={() => {
                        selectedUsers.forEach(id => handleUpdateUserStatus(id, 'active'));
                        setSelectedUsers([]);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-green-600"
                    >
                       <CheckCircle2 size={14} /> Activate
                    </button>
                    <button
                      onClick={() => {
                        selectedUsers.forEach(id => handleUpdateUserStatus(id, 'suspended'));
                        setSelectedUsers([]);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-600"
                    >
                       <XCircle size={14} /> Suspend
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20"
                    >
                       Cancel
                    </button>
                 </div>
              </motion.div>
           )}

           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                       <tr>
                          <th className="px-8 py-5">
                             <input
                               type="checkbox"
                               className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                               onChange={toggleAllUsers}
                               checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                             />
                          </th>
                          <th className="px-4 py-5">Consumer</th>
                          <th className="px-8 py-5">Role</th>
                          <th className="px-8 py-5">Wallet Balance</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50">
                       {filteredUsers.map((user) => (
                          <tr key={user._id} className={cn(
                            "hover:bg-gray-50 transition-colors group",
                            selectedUsers.includes(user._id) && "bg-red-50/30"
                          )}>
                             <td className="px-8 py-5">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                  checked={selectedUsers.includes(user._id)}
                                  onChange={() => toggleUserSelection(user._id)}
                                />
                             </td>
                             <td className="px-4 py-5">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black text-xs uppercase">
                                      {user.name.split(' ').map(n => n[0]).join('')}
                                   </div>
                                   <div className="flex flex-col">
                                      <p className="font-bold text-gray-900">{user.name}</p>
                                      <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                   <UserCog size={14} className="text-gray-400" />
                                   <span className="text-xs font-bold text-gray-700">{user.role}</span>
                                </div>
                             </td>
                             <td className="px-8 py-5 font-black text-gray-900">₦{user.walletBalance.toLocaleString()}</td>
                             <td className="px-8 py-5">
                                <span className={cn(
                                   "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                   user.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>{user.status}</span>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <button
                                  onClick={() => handleUpdateUserStatus(user._id, user.status === 'active' ? 'suspended' : 'active')}
                                  className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-white group-hover:bg-white"
                                >
                                   {user.status === 'active' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'PRICING' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <DollarSign size={20} className="text-red-600" />
                 Markup Controls
              </h3>
              <p className="text-sm text-gray-500 mb-8">Adjust your profit percentage across all service providers globally.</p>

              <div className="space-y-6">
                 {[
                    { id: 'data', label: 'Data Bundles', icon: Smartphone },
                    { id: 'airtime', label: 'Airtime Top-up', icon: Smartphone },
                    { id: 'cable', label: 'Cable TV', icon: Tv },
                    { id: 'sms', label: 'SMS Services', icon: Zap },
                 ].map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-red-200 transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                             <p.icon size={18} />
                          </div>
                          <span className="font-bold text-gray-800">{p.label}</span>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                               type="number"
                               value={markup[p.id] || ''}
                               onChange={(e) => handleUpdateMarkup(p.id, parseFloat(e.target.value))}
                               className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-center outline-none focus:ring-2 focus:ring-red-500 transition-all"
                               placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                          </div>
                          <button className="text-[10px] font-black text-gray-400 hover:text-red-600 uppercase tracking-widest transition-colors">Apply</button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-red-600 rounded-3xl p-10 text-white relative overflow-hidden flex flex-col justify-center items-center text-center">
              <AlertTriangle size={48} className="mb-6 text-red-200/50" />
              <h3 className="text-3xl font-black mb-4">Profit Strategy</h3>
              <p className="text-red-100 mb-10 leading-relaxed font-medium">High markups increase revenue but may drive customers away. Aim for a balance that ensures growth and sustainability.</p>
              <button className="w-full max-w-xs py-4 bg-white text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-700 transition-transform active:scale-95">Advanced Pricing</button>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32" />
           </div>
        </div>
      )}

      {/* Invite Modal Overlay */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
             >
                <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                   <h3 className="text-xl font-black text-gray-900 tracking-tight">Invite New User</h3>
                   <p className="text-gray-500 text-xs mt-1">Send an invitation to join your VTU network.</p>
                </div>
                <div className="p-8 space-y-6 text-left">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. user@gmail.com"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all font-bold"
                      />
                   </div>
                   <div className="pt-4 flex gap-3">
                      <button
                        onClick={() => setIsInviteModalOpen(false)}
                        className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                      >
                         Cancel
                      </button>
                      <button
                        onClick={() => setIsInviteModalOpen(false)}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-100 hover:bg-red-700 transition-colors"
                      >
                         Send Invite
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
