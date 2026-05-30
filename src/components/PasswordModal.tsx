'use client';

import { useState } from 'react';
import { usePassword } from '@/contexts/PasswordContext';

export default function PasswordModal() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { verifyPassword } = usePassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;

    setVerifying(true);
    setError(false);

    const success = await verifyPassword(password);

    if (success) {
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="bg-bg-card rounded-xl shadow-2xl border border-border-light overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border-light">
            <div className="p-2 bg-accent-subtle rounded-lg">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">需要密码访问</h2>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                请输入访问密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="请输入密码"
                disabled={verifying}
                className={`w-full px-4 py-3 rounded-lg border ${
                  error
                    ? 'border-error focus:ring-error focus:border-error'
                    : 'border-border-medium focus:ring-accent focus:border-accent'
                } bg-bg-card text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 transition-all disabled:opacity-50`}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  密码错误，请重试
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  验证中...
                </>
              ) : (
                '确认访问'
              )}
            </button>
          </form>

          {/* 底部 */}
          <div className="px-6 py-3 bg-bg-surface border-t border-border-light">
            <p className="text-xs text-text-secondary text-center">
              AI Tutor - 保护您的专属学习空间
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
