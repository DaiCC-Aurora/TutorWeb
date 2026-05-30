'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface PasswordContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  verifyPassword: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 调用 API 检查当前认证状态
   *
   * httpOnly Cookie 会自动随请求发送，
   * 因此即使 localStorage 被篡改也无法绕过。
   */
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      setIsAuthenticated(data.authenticated === true);
    } catch {
      // 网络或服务端异常 — 保守处理，视为未认证
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.authenticated) {
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 忽略登出请求的网络错误
    } finally {
      setIsAuthenticated(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <PasswordContext.Provider value={{ isAuthenticated, isLoading, verifyPassword, logout }}>
      {children}
    </PasswordContext.Provider>
  );
}

export function usePassword() {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error('usePassword must be used within a PasswordProvider');
  }
  return context;
}
