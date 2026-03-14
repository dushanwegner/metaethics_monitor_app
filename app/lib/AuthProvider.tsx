'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiGet, getApiBase, setApiBase, isAuthError, isNetworkError } from './api';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
type ConnStatus = 'online' | 'offline' | 'error';

interface AuthContextValue {
  authStatus: AuthStatus;
  connStatus: ConnStatus;
  isStaff: boolean;
  /** Force re-check session (e.g. after login). */
  checkSession: () => Promise<void>;
  /** Clear session and redirect to login. */
  logout: () => void;
  /** Handle an API error — redirects on 401, sets offline on network error. */
  handleError: (err: unknown) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Session check response from /api/dashboard/ (lightest authenticated endpoint). */
interface SessionCheck {
  favorites: unknown[];
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [connStatus, setConnStatus] = useState<ConnStatus>('online');
  const [isStaff, setIsStaff] = useState(false);
  const checkingRef = useRef(false);
  const isLoginPage = pathname === '/login';

  const checkSession = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      await apiGet<SessionCheck>('/api/dashboard/');
      setAuthStatus('authenticated');
      setConnStatus('online');
      try { setIsStaff(localStorage.getItem('auth:is_staff') === '1'); } catch {}
    } catch (err) {
      if (isAuthError(err)) {
        // 401/403 — not logged in
        setAuthStatus('unauthenticated');
        setConnStatus('online');
      } else if (isNetworkError(err)) {
        // Server unreachable — go to login. The monitor app is useless
        // without a server connection, and the login page shows connection
        // errors more clearly than an "offline" banner over empty content.
        setAuthStatus('unauthenticated');
        setConnStatus('offline');
      } else {
        // Server error (500, CORS, etc.) — treat as unauthenticated.
        setAuthStatus('unauthenticated');
        setConnStatus('error');
      }
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('auth:is_staff');
    } catch {}
    setAuthStatus('unauthenticated');
    router.push('/login');
  }, [router]);

  const handleError = useCallback((err: unknown) => {
    if (isAuthError(err)) {
      logout();
    } else if (isNetworkError(err)) {
      setConnStatus('offline');
    }
  }, [logout]);

  // Apply ?server= query param if present (persists to localStorage)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const server = params.get('server');
      if (server) {
        setApiBase(server);
        // Remove param from URL to keep it clean
        params.delete('server');
        const clean = params.toString();
        const newUrl = window.location.pathname + (clean ? `?${clean}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    } catch {}
  }, []);

  // Check session on mount
  useEffect(() => {
    // Skip session check on login page — no point, user isn't logged in yet
    if (!isLoginPage) {
      checkSession();
    } else {
      setAuthStatus('unauthenticated');
    }
  }, [checkSession, isLoginPage]);

  // Listen for online/offline events
  useEffect(() => {
    const goOnline = () => { setConnStatus('online'); checkSession(); };
    const goOffline = () => setConnStatus('offline');
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [checkSession]);

  // Redirect to login if unauthenticated (but not while on /login)
  useEffect(() => {
    if (authStatus === 'unauthenticated' && !isLoginPage) {
      router.push('/login');
    }
  }, [authStatus, router, isLoginPage]);

  return (
    <AuthContext.Provider value={{ authStatus, connStatus, isStaff, checkSession, logout, handleError }}>
      {children}
    </AuthContext.Provider>
  );
}
