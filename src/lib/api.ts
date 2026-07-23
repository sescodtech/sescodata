// ============================================================
// SescoHub API Service Layer
// ============================================================

// Every call site below passes a path that already starts with '/api/...'.
// If VITE_API_URL is set to something like 'https://sescodata.onrender.com/api'
// (an easy mistake given the variable name), naively concatenating it with
// those paths produces '.../api/api/products' — a 404 that looks like the
// backend is broken when it's actually a one-character env var typo. Strip
// any trailing '/api' (and trailing slashes) so BASE_URL is always just the
// bare origin, no matter how the env var was set.
const RAW_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '').replace(/\/api$/i, '');

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
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr: any) {
    // fetch() itself throws for DNS failures, CORS-blocked requests, or the
    // backend being unreachable — this is distinct from an HTTP error status
    // and had no error path before, so it surfaced as an unhandled rejection.
    throw new Error(`Could not reach the server at ${BASE_URL}. Check your connection or try again shortly.`);
  }

  // Read the body once, as text, regardless of what it turns out to be —
  // res.json() throws its own opaque "Unexpected end of JSON input" for an
  // empty body (e.g. a 405 from a static-file host, a 204, or a blocked
  // preflight) and a confusing parse error for an HTML error page (e.g. a
  // misrouted request landing on index.html). Reading as text first lets us
  // detect and report both cases clearly instead of throwing the generic
  // browser-level JSON error.
  const rawBody = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!rawBody) {
    throw new Error(
      res.ok
        ? 'Server returned an empty response.'
        : `Request failed (HTTP ${res.status} ${res.statusText || ''}). The server returned no response body — this usually means the request never reached the API (wrong base URL, or the route doesn't accept this method).`.trim()
    );
  }

  if (!contentType.includes('application/json')) {
    // Most commonly: the SPA's index.html (or some other HTML error page)
    // was returned instead of the API response — a routing/base-URL
    // mismatch, not something the API itself produced.
    const looksLikeHtml = /^\s*</.test(rawBody);
    throw new Error(
      looksLikeHtml
        ? `Request failed (HTTP ${res.status}). Received an HTML page instead of a JSON API response — this endpoint is likely being served by the wrong host (check VITE_API_URL / vercel.json rewrites) rather than the API.`
        : `Request failed (HTTP ${res.status}). Expected JSON but received: ${rawBody.slice(0, 200)}`
    );
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Request failed (HTTP ${res.status}). Response was not valid JSON.`);
  }

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

  me: () => apiFetch<{ success: boolean; user: AuthUser }>('/api/me', {}, true),
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
    const res = await apiFetch<ProductsResponse>('/api/products', {}, true);
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

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'customer';
  status: 'active' | 'suspended';
  isLocked: boolean;
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  walletBalance: number;
  lastLogin?: string;
  createdAt: string;
}

export interface AdminTransaction {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  amount: number;
  cost?: number;
  profit?: number;
  type: string;
  status: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  product: { name: string; category: string; recipient?: string; quantity?: number };
  paymentReference: string;
  failReason?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  _id: string;
  adminName: string;
  action: string;
  targetType: string;
  targetLabel?: string;
  before?: any;
  after?: any;
  reason?: string;
  ip?: string;
  createdAt: string;
}

export interface AdminNoteEntry {
  _id: string;
  adminName: string;
  note: string;
  createdAt: string;
}

export interface LoginEventEntry {
  _id: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface UserDetailResponse {
  success: boolean;
  user: AdminUser;
  transactionSummary: { totalSpent: number; totalOrders: number; delivered: number; failed: number; pending: number };
  recentTransactions: AdminTransaction[];
  loginHistory: LoginEventEntry[];
  adminNotes: AdminNoteEntry[];
  recentActivity: AuditLogEntry[];
}

export interface PaginatedUsers { success: boolean; users: AdminUser[]; total: number; page: number; pageSize: number; totalPages: number }
export interface PaginatedTransactions { success: boolean; transactions: AdminTransaction[]; total: number; page: number; pageSize: number; totalPages: number }

export interface UserListFilters { page?: number; pageSize?: number; status?: string; role?: string; kycStatus?: string; search?: string }
export interface TxnListFilters { page?: number; limit?: number; status?: string; category?: string; userId?: string; search?: string; dateFrom?: string; dateTo?: string }

function toQueryString(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const admin = {
  stats: () => apiFetch<{ success: boolean; stats: AdminStats }>('/api/admin/stats', {}, true),
  revenueChart: (days = 30) =>
    apiFetch<{ success: boolean; series: RevenuePoint[] }>(`/api/admin/revenue-chart?days=${days}`, {}, true),

  // Transactions (Module 3)
  transactions: (filters: TxnListFilters | number = {}) => {
    const f = typeof filters === 'number' ? { limit: filters } : filters;
    return apiFetch<PaginatedTransactions>(`/api/admin/transactions${toQueryString(f as any)}`, {}, true);
  },

  // Users (Module 2)
  users: (filters: UserListFilters = {}) =>
    apiFetch<PaginatedUsers>(`/api/admin/users${toQueryString(filters as any)}`, {}, true),
  userDetail: (userId: string) =>
    apiFetch<UserDetailResponse>(`/api/admin/users/${userId}`, {}, true),
  updateUserRole: (userId: string, role: string) =>
    apiFetch(`/api/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }, true),
  updateUserStatus: (userId: string, status: string, reason?: string) =>
    apiFetch(`/api/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ status, reason }) }, true),
  setUserLock: (userId: string, locked: boolean, reason?: string) =>
    apiFetch(`/api/admin/users/${userId}/lock`, { method: 'PUT', body: JSON.stringify({ locked, reason }) }, true),
  resetUserPassword: (userId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/admin/users/${userId}/reset-password`, { method: 'POST' }, true),
  addUserNote: (userId: string, note: string) =>
    apiFetch<{ success: boolean; note: AdminNoteEntry }>(`/api/admin/users/${userId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }, true),
  notifyUser: (userId: string, title: string, message: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/admin/users/${userId}/notify`, { method: 'POST', body: JSON.stringify({ title, message }) }, true),
  auditLogs: (params: { targetId?: string; action?: string; limit?: number } = {}) =>
    apiFetch<{ success: boolean; logs: AuditLogEntry[] }>(`/api/admin/audit-logs${toQueryString({ limit: 100, ...params } as any)}`, {}, true),

  // Wallet (Module 3)
  creditWallet: (userId: string, amount: number, reason: string) =>
    apiFetch<{ success: boolean; message: string; newBalance: number }>(`/api/admin/users/${userId}/wallet/credit`, { method: 'POST', body: JSON.stringify({ amount, reason }) }, true),
  debitWallet: (userId: string, amount: number, reason: string) =>
    apiFetch<{ success: boolean; message: string; newBalance: number }>(`/api/admin/users/${userId}/wallet/debit`, { method: 'POST', body: JSON.stringify({ amount, reason }) }, true),

  // Pricing (unchanged — future module)
  getMarkup: () => apiFetch('/api/admin/markup', {}, true),
  setMarkup: (markup: Record<string, number>) =>
    apiFetch('/api/admin/markup', { method: 'PUT', body: JSON.stringify(markup) }, true),
  providerStatus: () => apiFetch<{ success: boolean; providers: ProviderHealth[] }>('/api/admin/providers/status', {}, true),

  // Branding — primary brand color for the customer app
  setBranding: (primaryColor: string) =>
    apiFetch<{ success: boolean; primaryColor: string }>('/api/admin/branding', { method: 'PUT', body: JSON.stringify({ primaryColor }) }, true),
};

// Public — no auth required, since the color has to apply before login
export const settings = {
  getBranding: () => apiFetch<{ success: boolean; primaryColor: string }>('/api/settings/branding'),
};

// ============================================================
// MODULE 4 — Retry Failed Transactions & Manual Processing
// ============================================================
export interface RetryEligibility { eligible: boolean; reason?: string }
export interface RetryHistoryEntry { attemptedAt: string; adminName: string; previousDeliveryStatus: string; newDeliveryStatus: string; providerUsed?: string; reason?: string; error?: string }
export interface ManualReviewNote { adminName: string; note: string; createdAt: string }
export interface ManualReview { status: 'none' | 'pending' | 'approved' | 'rejected' | 'completed'; providerReference?: string; evidenceUrl?: string; notes: ManualReviewNote[] }

export interface OperationsTransaction extends AdminTransaction {
  retryCount: number;
  isRetryLocked: boolean;
  retryHistory: RetryHistoryEntry[];
  manualReview: ManualReview;
  refundedManually: boolean;
  reversedManually: boolean;
  retryEligibility?: RetryEligibility;
}

export interface TimelineEvent { type: string; label: string; detail?: string; admin?: string; timestamp: string }

export interface OperationsStats {
  failedTransactions: number;
  pendingReviews: number;
  manualProcessingQueue: number;
  retrySuccessRate: number | null;
  totalRetried: number;
  successfulRetries: number;
  todayRefundsAmount: number;
  todayRefundsCount: number;
  recentManualActions: AuditLogEntry[];
}

export interface OperationsQueueFilters { page?: number; pageSize?: number; search?: string; category?: string; provider?: string; userId?: string; dateFrom?: string; dateTo?: string; status?: string }
export interface PaginatedOperationsTransactions { success: boolean; transactions: OperationsTransaction[]; total: number; page: number; pageSize: number; totalPages: number }

export const adminOperations = {
  stats: () => apiFetch<{ success: boolean; stats: OperationsStats }>('/api/admin/operations/stats', {}, true),

  failedQueue: (filters: OperationsQueueFilters = {}) =>
    apiFetch<PaginatedOperationsTransactions>(`/api/admin/operations/failed${toQueryString(filters as any)}`, {}, true),
  pendingQueue: (filters: OperationsQueueFilters = {}) =>
    apiFetch<PaginatedOperationsTransactions>(`/api/admin/operations/pending${toQueryString(filters as any)}`, {}, true),
  manualReviewQueue: (filters: OperationsQueueFilters = {}) =>
    apiFetch<PaginatedOperationsTransactions>(`/api/admin/operations/manual-review${toQueryString(filters as any)}`, {}, true),

  timeline: (transactionId: string) =>
    apiFetch<{ success: boolean; transaction: OperationsTransaction; timeline: TimelineEvent[] }>(`/api/admin/operations/transactions/${transactionId}/timeline`, {}, true),

  retry: (transactionId: string, reason: string) =>
    apiFetch<{ success: boolean; retrySucceeded: boolean; transaction: OperationsTransaction; error?: string }>(`/api/admin/operations/transactions/${transactionId}/retry`, { method: 'POST', body: JSON.stringify({ reason }) }, true),
  bulkRetry: (transactionIds: string[], reason: string) =>
    apiFetch<{ success: boolean; message: string; results: { id: string; success: boolean; error?: string }[] }>('/api/admin/operations/transactions/bulk-retry', { method: 'POST', body: JSON.stringify({ transactionIds, reason }) }, true),

  flagForReview: (transactionId: string, reason: string) =>
    apiFetch<{ success: boolean; transaction: OperationsTransaction }>(`/api/admin/operations/transactions/${transactionId}/flag-review`, { method: 'POST', body: JSON.stringify({ reason }) }, true),
  approve: (transactionId: string, reason: string, providerReference?: string) =>
    apiFetch<{ success: boolean; transaction: OperationsTransaction }>(`/api/admin/operations/transactions/${transactionId}/approve`, { method: 'POST', body: JSON.stringify({ reason, providerReference }) }, true),
  reject: (transactionId: string, reason: string) =>
    apiFetch<{ success: boolean; transaction: OperationsTransaction }>(`/api/admin/operations/transactions/${transactionId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }, true),
  markCompleted: (transactionId: string, reason: string, providerReference: string) =>
    apiFetch<{ success: boolean; transaction: OperationsTransaction }>(`/api/admin/operations/transactions/${transactionId}/complete`, { method: 'POST', body: JSON.stringify({ reason, providerReference }) }, true),
  refund: (transactionId: string, reason: string, amount?: number) =>
    apiFetch<{ success: boolean; message: string; newBalance: number; transaction: OperationsTransaction }>(`/api/admin/operations/transactions/${transactionId}/refund`, { method: 'POST', body: JSON.stringify({ reason, amount }) }, true),
  reverse: (transactionId: string, reason: string, amount?: number) =>
    apiFetch<{ success: boolean; message: string; newBalance: number; transaction: OperationsTransaction }>(`/api/admin/operations/transactions/${transactionId}/reverse`, { method: 'POST', body: JSON.stringify({ reason, amount }) }, true),
  addNote: (transactionId: string, note: string, evidenceUrl?: string) =>
    apiFetch<{ success: boolean; transaction: OperationsTransaction }>(`/api/admin/operations/transactions/${transactionId}/notes`, { method: 'POST', body: JSON.stringify({ note, evidenceUrl }) }, true),
};

// ============================================================
// MODULE 5 — Product & Pricing Management
// ============================================================
export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  provider: string;
  providerId: string;
  costPrice: number;
  sellingPrice: number;
  validity?: string;
  planType?: string;
  enabled: boolean;
  visible: boolean;
}

export interface ProviderMappingEntry { provider: string; productCount: number; categories: string[] }
export interface ElectricityDisco { id: string; name: string }

export const adminProducts = {
  list: (filters: { category?: string; search?: string; status?: string } = {}) =>
    apiFetch<{ success: boolean; products: AdminProduct[]; total: number; categories: string[] }>(`/api/admin/products${toQueryString(filters as any)}`, {}, true),
  categories: () => apiFetch<{ success: boolean; categories: string[]; discos: ElectricityDisco[] }>('/api/admin/products/categories', {}, true),
  providerMapping: () => apiFetch<{ success: boolean; mapping: ProviderMappingEntry[] }>('/api/admin/products/provider-mapping', {}, true),

  toggleEnabled: (productId: string, enabled: boolean, category: string, reason: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/products/${encodeURIComponent(productId)}/enabled`, { method: 'PUT', body: JSON.stringify({ enabled, category, reason }) }, true),
  toggleVisibility: (productId: string, visible: boolean, category: string, reason: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/products/${encodeURIComponent(productId)}/visibility`, { method: 'PUT', body: JSON.stringify({ visible, category, reason }) }, true),
  setCustomPricing: (productId: string, category: string, reason: string, customSellingPrice?: number | null, customMarkupPct?: number | null) =>
    apiFetch<{ success: boolean }>(`/api/admin/products/${encodeURIComponent(productId)}/pricing`, { method: 'PUT', body: JSON.stringify({ category, reason, customSellingPrice, customMarkupPct }) }, true),
  bulkUpdatePricing: (productIds: string[], customMarkupPct: number, reason: string) =>
    apiFetch<{ success: boolean; message: string }>('/api/admin/products/bulk-pricing', { method: 'POST', body: JSON.stringify({ productIds, customMarkupPct, reason }) }, true),
  importPricing: (csv: string, reason: string) =>
    apiFetch<{ success: boolean; message: string; results: { row: number; productId: string; success: boolean; error?: string }[] }>('/api/admin/products/import', { method: 'POST', body: JSON.stringify({ csv, reason }) }, true),

  /** Export returns raw CSV, not JSON — bypasses apiFetch's JSON parsing and triggers a real browser download, reusing the same auth token every other admin call uses. */
  exportPricingCsv: async () => {
    const res = await fetch(`${BASE_URL}/api/admin/products/export`, {
      headers: { Authorization: `Bearer ${token.get()}` },
    });
    if (!res.ok) throw new Error('Failed to export pricing');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sescohub-pricing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
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

// Real Nigerian carrier prefix ranges (as allocated by the NCC) — used only
// to suggest a network from a typed number; never changes what the user can
// actually select or submit.
const NETWORK_PREFIXES: Record<string, string[]> = {
  mtn: ['0803', '0806', '0703', '0706', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'],
  glo: ['0805', '0807', '0811', '0815', '0905', '0915'],
  airtel: ['0802', '0808', '0812', '0708', '0701', '0902', '0901', '0904', '0907', '0912'],
  '9mobile': ['0809', '0817', '0818', '0908', '0909'],
};

export function detectNetworkId(phone: string): string | null {
  const clean = phone.replace(/\s/g, '');
  const prefix = clean.slice(0, 4);
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) return network;
  }
  return null;
}

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
