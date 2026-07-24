import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth as authApi, wallet as walletApi, token as tokenStore, type AuthUser } from '../lib/api';

type UIRole = 'USER' | 'ADMIN';
function mapRole(backendRole: AuthUser['role']): UIRole {
  return String(backendRole).toLowerCase() === 'admin' ? 'ADMIN' : 'USER';
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UIRole;
  walletBalance: number;
  backendRole: AuthUser['role'];
  kycStatus: AuthUser['kycStatus'];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildUser(raw: AuthUser): User {
  // SECURITY FIX: the previous version granted client-side ADMIN role to any
  // account whose email matched a hardcoded string, and used the user's email
  // as a fake "id" because /api/me never returned a real one. Both fixed —
  // role now comes only from the backend-issued JWT-verified role, and the
  // backend now returns a real id.
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || '',
    role: mapRole(raw.role),
    walletBalance: raw.walletBalance ?? 0,
    backendRole: raw.role,
    kycStatus: raw.kycStatus ?? 'not_started',
  };
}

async function fetchMe(): Promise<AuthUser | null> {
  const t = tokenStore.get();
  if (!t) return null;
  try {
    const data = await authApi.me();
    if (!data.success || !data.user) return null;

    const user = data.user as AuthUser;
    if (user.walletBalance != null) return user;

    try {
      const walletData = await walletApi.get();
      return { ...user, walletBalance: walletData.balance };
    } catch {
      return user;
    }
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: verify stored token against backend /api/me
  useEffect(() => {
    (async () => {
      const me = await fetchMe();
      if (me) {
        setUser(buildUser(me));
      } else {
        // Token is invalid or expired — clear it
        tokenStore.clear();
        localStorage.removeItem('dh_user');
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.token);
    const u = buildUser(res.user);
    setUser(u);
    return u; // Return user for immediate redirection
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await authApi.register(name, email, password, phone);
    tokenStore.set(res.token);
    const u = buildUser(res.user);
    setUser(u);
    return u; // Return user for immediate redirection
  };

  const logout = () => {
    tokenStore.clear();
    localStorage.removeItem('dh_user');
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await fetchMe();
    if (me) setUser(buildUser(me));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
