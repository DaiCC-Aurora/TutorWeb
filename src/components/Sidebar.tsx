'use client';

import { useState } from 'react';
import { useMessageHistory, type Conversation } from '@/contexts/MessageHistoryContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onConversationSelect: (id: string | null) => void;
  currentConversationId: string | null;
}

export default function Sidebar({ isOpen, onClose, onNewChat, onConversationSelect, currentConversationId }: SidebarProps) {
  const { conversations, isLoading, deleteConversation } = useMessageHistory();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个对话吗？')) {
      setDeletingId(id);
      try {
        await deleteConversation(id);
        if (currentConversationId === id) {
          onConversationSelect(null);
        }
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* 侧边栏 */}
      <aside className="fixed top-0 left-0 h-full w-72 bg-bg-sidebar border-r border-border-light z-50 flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0">
        {/* 头部 */}
        <div className="p-4 border-b border-border-light flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">历史对话</h2>
          <button
            onClick={onNewChat}
            className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            + 新对话
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-8 text-text-secondary text-sm">加载中...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">暂无历史记录</div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    onConversationSelect(conv.id);
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-accent-subtle text-accent'
                      : 'hover:bg-bg-surface text-text-secondary'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {formatDate(conv.updated_at)} · {conv.messageCount || 0} 条消息
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all disabled:opacity-50"
                    title="删除对话"
                  >
                    <svg
                      className="w-4 h-4 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="p-3 border-t border-border-light text-center">
          <p className="text-xs text-text-tertiary">AI Tutor - 记忆功能</p>
        </div>
      </aside>
    </>
  );
}
