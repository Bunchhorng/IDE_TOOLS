import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import { setIdentity, getIdentity, clearIdentity } from '../lib/offline/service';
import { isNetworkError } from '../lib/offline/sync';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<{ user: User }>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<{ user: User }>;
  upgradeGuest: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const checkingRef = useRef(false);

  const restoreCachedIdentity = useCallback((): boolean => {
    const cached = getIdentity();
    if (cached) {
      setUser(cached.user);
      return true;
    }
    return false;
  }, []);

  const ensureGuestSession = useCallback(async () => {
    try {
      const response = await authService.guest();
      authService.setToken(response.data.token);
      setUser(response.data.user);
      setIdentity(response.data.user);
    } catch (err) {
      if (isNetworkError(err) && restoreCachedIdentity()) {
        /* offline boot from the cached identity */
      }
    }
  }, [restoreCachedIdentity]);

  const checkAuth = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    sessionStorage.removeItem('guest_recovery');
    const token = authService.getToken();
    if (!token) {
      await ensureGuestSession();
      setIsLoading(false);
      checkingRef.current = false;
      return;
    }
    try {
      const response = await authService.me();
      setUser(response.data);
      setIdentity(response.data);
      setIsLoading(false);
    } catch (err) {
      if (isNetworkError(err) && restoreCachedIdentity()) {
        // keep the token and cached user — a reconnect later can sync
        setIsLoading(false);
      } else {
        authService.clearToken();
        await ensureGuestSession();
        setIsLoading(false);
      }
    } finally {
      checkingRef.current = false;
    }
  }, [ensureGuestSession, restoreCachedIdentity]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    authService.setToken(response.data.token);
    setUser(response.data.user);
    setIdentity(response.data.user);
    setIsLoading(false);
    return response.data;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => {
    const response = await authService.register({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    authService.setToken(response.data.token);
    setUser(response.data.user);
    setIdentity(response.data.user);
    setIsLoading(false);
    return response.data;
  };

  const upgradeGuest = async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => {
    const response = await authService.upgradeGuest({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    setUser(response.data.user);
    setIdentity(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      /* token may already be invalid server-side */
    } finally {
      authService.clearToken();
      clearIdentity();
      setUser(null);
      setIsLoading(false);
      await ensureGuestSession();
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isGuest: user?.is_guest ?? false,
      login,
      register,
      upgradeGuest,
      logout,
      checkAuth,
    }),
    [user, isLoading, checkAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}