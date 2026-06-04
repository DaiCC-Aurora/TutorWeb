'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';
import { useMessageHistory, type ConversationType, type Conversation } from '@/contexts/MessageHistoryContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  currentConversationId: string | null;
}

// 导航菜单配置
const NAV_ITEMS: { label: string; href: string; type: ConversationType; icon: ReactNode; description: string }[] = [
  {
    label: 'Chat',
    href: '/chat',
    type: 'chat',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    description: '自由对话、问题解答',
  },
  {
    label: 'Co-Writer',
    href: '/co-writer',
    type: 'co-writer',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    description: '写作辅助、改写润色',
  },
];

export default function Sidebar({ isOpen, onClose, onNewChat, currentConversationId }: SidebarProps) {
  const pathname = usePathname();
  const { conversations, isLoading, deleteConversation } = useMessageHistory();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 判断当前路由类型
  const activeType: ConversationType = pathname?.startsWith('/co-writer') ? 'co-writer' : 'chat';
  const activeNav = activeType;

  // 按当前路由类型过滤会话列表
  const filteredConversations = conversations.filter((conv) => conv.type === activeType);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个对话吗？')) {
      setDeletingId(id);
      try {
        await deleteConversation(id);
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

  // 根据当前类型生成会话链接
  const getConversationHref = (convId: string) => {
    return activeType === 'chat' ? `/chat/${convId}` : `/co-writer/${convId}`;
  };

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-bg-sidebar border-r border-border-light z-50 flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* 头部 - 应用导航 */}
        <div className="p-4 border-b border-border-light">
          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.type === activeNav;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent text-white'
                      : 'hover:bg-bg-surface text-text-secondary'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm truncate">{item.label}</p>
                    <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-text-tertiary'}`}>
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 会话列表头部 */}
        <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
          <h2 className="font-semibold text-text-primary text-sm">
            {activeType === 'chat' ? 'Chat 历史' : 'Co-Writer 历史'}
          </h2>
          <button
            onClick={onNewChat}
            className="px-2.5 py-1.5 text-xs font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            + 新建
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-8 text-text-secondary text-sm">加载中...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">暂无历史记录</div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex flex-col cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-accent-subtle text-accent'
                      : 'hover:bg-bg-surface text-text-secondary'
                  }`}
                >
                  {/* 会话标题区域 */}
                  <Link
                    href={getConversationHref(conv.id)}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className="flex-1 p-3"
                  >
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {formatDate(conv.updated_at)} · {conv.messageCount || 0} 条消息
                    </p>
                  </Link>

                  {/* 操作按钮区域 - 悬停显示 */}
                  <div className={`flex items-center justify-end gap-1 px-3 pb-3 ${currentConversationId === conv.id ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all disabled:opacity-50"
                      title="删除对话"
                    >
                      <svg
                        className="w-3.5 h-3.5"
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
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="p-3 border-t border-border-light text-center">
          <p className="text-xs text-text-tertiary">Aurora Tutor v1.0</p>
        </div>
      </aside>
    </>
  );
}
