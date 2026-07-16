// ============================================================
// SescoHub API Service Layer
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const normalizeProvider = (value?: string) =>
  String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '');

const providerAliasMap: Record<string, string[]> = {
  mtn: ['mtn'],
  airtel: ['airtel'],
  glo: ['glo', 'globacom'],
  '9mobile': ['9mobile', 'etisalat'],
  dstv: ['dstv', 'dstvsubscription', 'dstv_subscription'],
  gotv: ['gotv', 'gotvsubscription', 'gotv_subscription'],
  startimes: ['startimes', 'startimessubscription', 'startimes_subscription'],
  ikedc: ['ikedc', 'ikejaelectric', 'ikejaelectricity'],
  ekedc: ['ekedc', 'ekoelectric', 'ekoelectricity'],
  aedc: ['aedc', 'abujaelectric', 'abujaelectricity'],
  phden: ['phden', 'portharcourtelectricity'],
  ibedc: ['ibedc', 'ibadandisco', 'ibadanelectricity'],
  kedco: ['kedco', 'kanodisco', 'kanoelectricity'],
};

export const matchesProvider = (product: Product, providerId: string) => {
  const normalizedProduct = normalizeProvider(product.provider || product.prov);
  const normalizedTarget = normalizeProvider(providerId);
  if (!normalizedProduct || !normalizedTarget) return false;
  if (normalizedProduct === normalizedTarget) return true;

  const normalizedAliases = providerAliasMap[normalizedTarget] ?? [normalizedTarget];
  if (normalizedAliases.includes(normalizedProduct)) return true;

  return normalizedProduct.includes(normalizedTarget) || normalizedTarget.includes(normalizedProduct);
};

// ── Token storage ─────────────────────────────────────────────
export const token = {
  get: () => localStorage.getItem('dh_token'),
  set: (t: string) => localStorage.setItem('dh_token', t),
  clear: () => localStorage.removeItem('dh_token'),
};

// ── Base fetch helper ──────────────────────────────────────────
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const t = token.get();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data as T;
}

// ============================================================
// AUTH
// ============================================================
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  walletBalance?: number;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export const auth = {
  register: (name: string, email: string, password: string, phone?: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  requestPasswordReset: (email: string) =>
    apiFetch<{ success: boolean; message: string }>('/api/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, email: string, newPassword: string) =>
    apiFetch<AuthResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, email, newPassword }),
    }),

  updateProfile: (data: { name?: string; phone?: string }) =>
    apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }, true),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, true),
};

// ============================================================
// PRODUCTS / PLANS
// ============================================================
export interface Product {
  id: string;
  name: string;
  category: string;
  provider: string;
  price: number;
  validity?: string;
  planType?: string;
  apiSource?: string;
  is_promo?: boolean;
  original_price?: number;
  // Legacy aliases kept for safety
  cat?: string;
  prov?: string;
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
}

export const products = {
  list: async () => {
    const res = await apiFetch<ProductsResponse>('/api/products');
    // FIXED: backend returns `sellingPrice`, but every page in this app reads
    // `.price` — that mismatch meant prices rendered as NaN/blank everywhere.
    // Normalize once here instead of touching every call site.
    res.products = res.products.map((p: any) => ({ ...p, price: p.price ?? p.sellingPrice }));
    return res;
  },

  byNetwork: async (network: string, cat = 'data') => {
    const res = await products.list();
    return res.products.filter((p) =>
      matchesProvider(p, network) &&
      ((p.category || p.cat) === cat || (cat === 'data' && !p.category && !p.cat)),
    );
  },

  byCategory: async (cat: string) => {
    const res = await products.list();
    return res.products.filter((p) => (p.category || p.cat) === cat);
  },
};

// ============================================================
// PURCHASE
// ============================================================
export interface PurchaseResponse {
  success: boolean;
  message: string;
  ref: string;
}

/**
 * FIXED: the old `payment.walletBuy` / `payment.initiate` called
 * /api/payment/wallet-buy and /api/payment/initiate — neither of which the
 * backend ever implemented. Every "buy" button in the app was silently
 * broken. This now points at the real, wired-up /api/purchase/* routes.
 */
export const purchase = {
  buyData: (params: { productId: string; recipient: string; quantity?: number }) =>
    apiFetch<PurchaseResponse>('/api/purchase/buy-data', {
      method: 'POST',
      body: JSON.stringify({ ...params, quantity: params.quantity ?? 1 }),
    }, true),

  buyAirtime: (params: { network: string; phone: string; amount: number; quantity?: number }) =>
    apiFetch<PurchaseResponse>('/api/purchase/buy-airtime', {
      method: 'POST',
      body: JSON.stringify({ ...params, quantity: params.quantity ?? 1 }),
    }, true),

  buyCable: (params: { productId: string; smartcard: string; phone?: string }) =>
    apiFetch<PurchaseResponse>('/api/purchase/buy-cable', {
      method: 'POST',
      body: JSON.stringify(params),
    }, true),

  buyElectricity: (params: { disco: string; meter: string; amount: number; phone?: string }) =>
    apiFetch<PurchaseResponse>('/api/purchase/buy-electricity', {
      method: 'POST',
      body: JSON.stringify(params),
    }, true),

  buyExamPin: (params: { productId: string; quantity?: number }) =>
    apiFetch<PurchaseResponse>('/api/purchase/buy-exam', {
      method: 'POST',
      body: JSON.stringify({ ...params, quantity: params.quantity ?? 1 }),
    }, true),

  buyRechargeCard: (params: { network: string; amount: number; quantity?: number }) =>
    apiFetch<PurchaseResponse>('/api/purchase/buy-recharge-card', {
      method: 'POST',
      body: JSON.stringify({ ...params, quantity: params.quantity ?? 1 }),
    }, true),
};

// ============================================================
// PAYMENT (wallet funding only)
// ============================================================
export interface PaymentInitResponse {
  success: boolean;
  paymentUrl: string;
  reference: string;
}

// ============================================================
// WALLET
// ============================================================
export interface WalletLedgerEntry {
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balance?: number;
}

export interface WalletResponse {
  success: boolean;
  balance: number;
  ledger: WalletLedgerEntry[];
}

export const wallet = {
  /** Get live wallet balance and last 30 ledger entries */
  get: () => apiFetch<WalletResponse>('/api/my/wallet', {}, true),

  /** Initiate a Paystack payment to top up the wallet */
  depositInitiate: (amount: number) =>
    apiFetch<PaymentInitResponse>('/api/wallet/deposit/initiate', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }, true),
};

// ============================================================
// TRANSACTIONS
// ============================================================
export interface Transaction {
  id: string;
  ref: string;
  product: string;
  category: string;
  recipient: string;
  amount: number;
  status: 'success' | 'pending' | 'failed' | 'paid';
  deliveryStatus: 'delivered' | 'pending' | 'failed';
  date: string;
  statusMessage?: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions: Transaction[];
}

/**
 * FIXED: the backend Transaction document nests `product: {name, category,
 * recipient, quantity}`, uses `_id`/`createdAt`/`paymentReference`, and never
 * matched this flat `Transaction` interface. Every page reading `.product`,
 * `.recipient`, `.date`, `.id`, `.ref` as flat strings was silently broken.
 * Normalize once here instead of touching every call site.
 */
function normalizeTransaction(raw: any): Transaction {
  return {
    id: raw.id ?? raw._id,
    ref: raw.paymentReference ?? raw.ref ?? '',
    product: raw.product?.name ?? raw.product ?? raw.type,
    category: raw.product?.category ?? raw.category ?? raw.type,
    recipient: raw.product?.recipient ?? raw.recipient ?? '',
    amount: raw.amount,
    status: raw.status,
    deliveryStatus: raw.deliveryStatus ?? (raw.status === 'success' ? 'delivered' : raw.status === 'failed' ? 'failed' : 'pending'),
    date: raw.date ?? raw.createdAt,
    statusMessage: raw.failReason ?? raw.deliveryError ?? raw.statusMessage,
  };
}

export const transactions = {
  list: async () => {
    const res = await apiFetch<{ success: boolean; transactions: any[] }>('/api/my/transactions', {}, true);
    return { success: res.success, transactions: (res.transactions || []).map(normalizeTransaction) };
  },
};

// ============================================================
// PLATFORM INFO
// ============================================================
export interface InfoResponse {
  business: string;
  version: string;
  support: { phone: string; whatsapp: string };
}

export const info = {
  get: () => apiFetch<InfoResponse>('/api/info'),
};

// ============================================================
// CONTACT / AGENT / SUPPORT
// Real backend endpoints — replaces the previous mailto: fallback forms.
// ============================================================
export const contact = {
  submit: (data: { name: string; email: string; message: string }) =>
    apiFetch<{ success: boolean; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const agent = {
  apply: (data: { name: string; phone: string; email: string; message?: string }) =>
    apiFetch<{ success: boolean; message: string }>('/api/agent/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface SupportTicket {
  _id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  replies: { from: 'customer' | 'admin'; message: string; createdAt: string }[];
}

export const support = {
  createTicket: (data: { subject: string; message: string }) =>
    apiFetch<{ success: boolean; message: string; ticket: SupportTicket }>('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true),

  myTickets: () =>
    apiFetch<{ success: boolean; tickets: SupportTicket[] }>('/api/support/tickets', {}, true),
};

// ============================================================
// ADMIN
// Trimmed to match what the backend actually implements. The original had
// calls to /api/info, /api/admin/services, /api/admin/wallet,
// /api/admin/diagnostics, /api/admin/retry, /api/admin/plans/refresh,
// /api/admin/overrides, /api/admin/products/:id/toggle|feature, and
// /api/superadmin/tenants — none of which existed on the server. Removed as
// dead code rather than leaving buttons that 404.
// ============================================================
export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'low_balance' | 'offline' | 'unconfigured';
  balance: number;
  healthy: boolean;
  minBalance?: number;
  error?: string;
}

export interface SystemAlert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface AdminStats {
  revenue: number;
  profit: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalUsers: number;
  activeUsers: number;
  totalWalletBalance: number;
  totalTransactions: number;
  delivered: number;
  pending: number;
  failed: number;
  failureBreakdown: Record<string, number>;
  todayTransactions: number;
  openTickets: number;
  providers: ProviderHealth[];
  alerts: SystemAlert[];
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  profit: number;
  count: number;
}

export const admin = {
  stats: () => apiFetch<{ success: boolean; stats: AdminStats }>('/api/admin/stats', {}, true),
  revenueChart: (days = 30) =>
    apiFetch<{ success: boolean; series: RevenuePoint[] }>(`/api/admin/revenue-chart?days=${days}`, {}, true),
  transactions: (limit = 500) =>
    apiFetch(`/api/admin/transactions?limit=${limit}`, {}, true),
  users: () => apiFetch('/api/admin/users', {}, true),
  updateUserRole: (userId: string, role: string) =>
    apiFetch(`/api/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }, true),
  updateUserStatus: (userId: string, status: string) =>
    apiFetch(`/api/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, true),
  getMarkup: () => apiFetch('/api/admin/markup', {}, true),
  setMarkup: (markup: Record<string, number>) =>
    apiFetch('/api/admin/markup', { method: 'PUT', body: JSON.stringify(markup) }, true),
  providerStatus: () => apiFetch<{ success: boolean; providers: ProviderHealth[] }>('/api/admin/providers/status', {}, true),
};

// ============================================================
// UTILITIES
// ============================================================
export const NETWORKS = [
  { id: 'mtn',     name: 'MTN Nigeria',  shortColor: '#FFCB04', bg: 'bg-yellow-400', textColor: 'text-gray-900' },
  { id: 'airtel',  name: 'Airtel Nigeria', shortColor: '#EF4444', bg: 'bg-red-600',    textColor: 'text-white' },
  { id: 'glo',     name: 'Glo World',    shortColor: '#16A34A', bg: 'bg-green-600',  textColor: 'text-white' },
  { id: '9mobile', name: '9Mobile',      shortColor: '#065F46', bg: 'bg-emerald-900', textColor: 'text-white' },
] as const;

export const CABLE_PROVIDERS = [
  { id: 'dstv_subscription', name: 'DSTV', bg: 'bg-blue-700',    textColor: 'text-white' },
  { id: 'gotv_subscription', name: 'GOTV', bg: 'bg-orange-500',  textColor: 'text-white' },
  { id: 'startimes',         name: 'StarTimes', bg: 'bg-red-700', textColor: 'text-white' },
] as const;

export const AIRTIME_UNIT_COST = 100; // backend RAW airtime cost per unit

export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
