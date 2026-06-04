'use client';

import { useState } from 'react';
import type { Conversation } from '@/contexts/MessageHistoryContext';

// 本地 Message 类型（用于前端展示）
export interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    hasImage?: boolean;
  };
}

interface ExportSessionProps {
  conversation: Conversation | null;
  messages: DisplayMessage[];
}

export default function ExportSession({ conversation, messages }: ExportSessionProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 导出为 Markdown
  const exportToMarkdown = async () => {
    if (!conversation || messages.length === 0) return;

    setIsExporting(true);
    try {
      let markdown = `# ${conversation.title}\n\n`;
      markdown += `**模式**: ${conversation.type === 'chat' ? 'Chat' : 'Co-Writer'}\n`;
      markdown += `**创建时间**: ${new Date(conversation.created_at).toLocaleString('zh-CN')}\n`;
      markdown += `**消息数**: ${messages.length}\n\n---\n\n`;

      messages.forEach((msg) => {
        const role = msg.role === 'user' ? '**用户**' : '**AI 助手**';
        const time = msg.timestamp.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        markdown += `${role} (${time}):\n\n${msg.content}\n\n---\n\n`;
      });

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  // 导出为 JSON
  const exportToJSON = async () => {
    if (!conversation || messages.length === 0) return;

    setIsExporting(true);
    try {
      const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        conversation: {
          id: conversation.id,
          title: conversation.title,
          type: conversation.type,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        },
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          hasImage: msg.metadata?.hasImage ?? false,
          createdAt: msg.timestamp.toISOString(),
        })),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  if (!conversation) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-accent transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span className="hidden sm:inline">导出会话</span>
        <span className="sm:hidden">📤</span>
      </button>

      {showMenu && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* 下拉菜单 */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-bg-card dark:bg-bg-primary border border-border-light rounded-lg shadow-lg z-50 overflow-hidden">
            <button
              onClick={exportToMarkdown}
              disabled={isExporting}
              className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-surface dark:hover:bg-bg-card flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>导出为 Markdown</span>
            </button>
            <button
              onClick={exportToJSON}
              disabled={isExporting}
              className="w-full px-4 py-2.5 text-left text-text-secondary hover:bg-bg-surface dark:hover:bg-bg-card flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>导出为 JSON</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
