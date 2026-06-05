'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import PasswordModal from '@/components/PasswordModal';
import { usePassword } from '@/contexts/PasswordContext';

interface SidebarShellProps {
  /** Main content area */
  children: ReactNode;
  /** Header title text */
  title: string;
  /** Optional icon displayed next to the title */
  titleIcon?: ReactNode;
  /** Optional actions rendered on the right side of the header */
  headerActions?: ReactNode;
  /** Callback for "new chat" action in sidebar */
  onNewChat: () => void;
  /** Currently active conversation ID (highlights in sidebar) */
  currentConversationId: string | null;
  /** Content area max-width preset: 'narrow' → max-w-3xl, default → max-w-5xl */
  maxWidth?: 'narrow' | 'wide';
}

/**
 * Unified layout shell providing sidebar, header bar, content area, and password gate.
 *
 * - Manages sidebar open/close state internally (including Escape key).
 * - Handles responsive behavior: mobile overlay, always-visible on desktop.
 * - Renders the password modal globally when unauthenticated.
 */
export default function SidebarShell({
  children,
  title,
  titleIcon,
  headerActions,
  onNewChat,
  currentConversationId,
  maxWidth = 'wide',
}: SidebarShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated } = usePassword();

  // Close sidebar on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const contentWidth = maxWidth === 'narrow' ? 'max-w-3xl' : 'max-w-5xl';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-bg-surface to-bg-card dark:from-bg-sidebar dark:to-bg-primary flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={onNewChat}
        currentConversationId={currentConversationId}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="sticky top-0 z-10 backdrop-blur-sm bg-bg-card/80 dark:bg-bg-primary/80 border-b border-border-light">
          <div className={`${contentWidth} mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4`}>
            {/* Hamburger — visible only below lg breakpoint */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-bg-surface dark:hover:bg-bg-card rounded-lg transition-colors"
              aria-label="打开侧边栏"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Title area */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 lg:flex-none">
              {titleIcon && <span className="flex-shrink-0">{titleIcon}</span>}
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-text-primary truncate">
                {title}
              </h1>
            </div>

            {/* Header actions (right side) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerActions}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main
          className={`flex-1 ${contentWidth} mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 pb-6 sm:pb-8 flex flex-col gap-4 sm:gap-6 min-h-0`}
        >
          {children}
        </main>
      </div>

      {/* Global password gate overlay */}
      {!isAuthenticated && (
        <div className="fixed inset-0 bg-gradient-to-b from-bg-surface to-bg-card dark:from-bg-sidebar dark:to-bg-primary z-50">
          <PasswordModal />
        </div>
      )}
    </div>
  );
}
