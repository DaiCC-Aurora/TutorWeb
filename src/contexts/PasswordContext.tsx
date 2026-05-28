'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PasswordContextType {
  isAuthenticated: boolean;
  verifyPassword: (password: string) => boolean;
  logout: () => void;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检查 localStorage 中是否有缓存的登录状态
    const cachedAuth = localStorage.getItem('app_authenticated');
    if (cachedAuth === 'true') {
      setIsAuthenticated(true);
    } else {
      // 如果没有缓存，强制清除（确保测试时总是需要输入密码）
      localStorage.removeItem('app_authenticated');
    }
    setIsLoading(false);
  }, []);

  const verifyPassword = (password: string): boolean => {
    const expectedPassword = process.env.NEXT_PUBLIC_APP_PASSWORD;

    // 如果环境变量未设置，允许访问（开发环境）
    if (!expectedPassword || expectedPassword === 'your_password_here') {
      setIsAuthenticated(true);
      return true;
    }

    const isCorrect = password === expectedPassword;
    if (isCorrect) {
      setIsAuthenticated(true);
      localStorage.setItem('app_authenticated', 'true');
    }
    return isCorrect;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('app_authenticated');
  };

  if (isLoading) {
    return null;
  }

  return (
    <PasswordContext.Provider value={{ isAuthenticated, verifyPassword, logout }}>
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
