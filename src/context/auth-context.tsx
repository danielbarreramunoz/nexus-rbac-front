'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, clearToken, setToken } from '@/services/api-client';

export interface SessionUser {
  id: string;
  email: string;
  tenantId: string | null;
  roles: string[];
  permissions: string[];
}

interface LoginResponse {
  accessToken: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'nexus:token';

function decodePayload(token: string): SessionUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const data: unknown = JSON.parse(json);
    if (typeof data !== 'object' || data === null) return null;
    const payload = data as Record<string, unknown>;
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null;
    }
    if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      tenantId:
        typeof payload.tenantId === 'string' ? payload.tenantId : null,
      roles: Array.isArray(payload.roles)
        ? payload.roles.filter((r): r is string => typeof r === 'string')
        : [],
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.filter((p): p is string => typeof p === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(STORAGE_KEY);
    if (token) {
      const session = decodePayload(token);
      if (session) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata la sesión desde localStorage solo al montar (evita mismatch de hidratación)
        setUser(session);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    const session = decodePayload(res.accessToken);
    if (!session) {
      clearToken();
      throw new Error('Token inválido recibido del servidor');
    }
    setToken(res.accessToken);
    setUser(session);
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
