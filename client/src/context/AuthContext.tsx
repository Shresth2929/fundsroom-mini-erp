import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { apiFetch, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

// After the new apiFetch unwraps { success, message, data }, the actual shapes are:
// POST /auth/login  → { token: string, user: User }
// GET  /auth/me     → { user: User }

interface LoginResponseData {
  token: string;
  user: User;
}

interface MeResponseData {
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // apiFetch now returns the unwrapped data object: { user: User }
      const res = await apiFetch<MeResponseData>('/auth/me');
      if (res?.user) {
        setUser(res.user);
      } else {
        removeAuthToken();
      }
    } catch {
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      // apiFetch returns unwrapped { token, user }
      const res = await apiFetch<LoginResponseData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res?.token && res?.user) {
        setAuthToken(res.token);
        setUser(res.user);
      } else {
        throw new Error('Login failed: invalid response from server.');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Invalid email or password';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
