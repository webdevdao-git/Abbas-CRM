import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Validate any stored token once on boot.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { admin: current } = await api.me();
        if (!cancelled) setAdmin(current);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from anywhere in the app lands here.
  useEffect(() => {
    const onExpired = () => setAdmin(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const { token, admin: current } = await api.login(credentials);
      setToken(token);
      setAdmin(current);
      return current;
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    toast.info('Signed out.');
  }, [toast]);

  const value = useMemo(
    () => ({ admin, loading, login, logout, isAuthenticated: Boolean(admin) }),
    [admin, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
