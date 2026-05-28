'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  has_image: boolean;
  created_at: string;
}

interface MessageHistoryContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  createConversation: (title: string) => Promise<string>;
  setCurrentConversationId: (id: string | null) => void;
  deleteConversation: (id: string) => Promise<void>;
  saveMessage: (conversationId: string, role: 'user' | 'assistant', content: string, hasImage: boolean) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<Message[]>;
}

const MessageHistoryContext = createContext<MessageHistoryContextType | undefined>(undefined);

export function MessageHistoryProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载所有会话列表
  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  // 创建新会话
  const createConversation = async (title: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      const data = await response.json();
      setConversations((prev) => [data, ...prev]);
      return data.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 保存消息
  const saveMessage = async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    hasImage: boolean
  ): Promise<void> => {
    try {
      await fetch('/api/save-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, role, content, hasImage }),
      });
    } catch (err) {
      console.error('Failed to save message:', err);
      throw err;
    }
  };

  // 加载指定会话的消息
  const loadMessages = async (conversationId: string): Promise<Message[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await response.json();
      return data.messages || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 删除会话
  const deleteConversation = async (id: string): Promise<void> => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  };

  // 首次加载会话列表
  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <MessageHistoryContext.Provider
      value={{
        conversations,
        currentConversationId,
        isLoading,
        error,
        fetchConversations,
        createConversation,
        setCurrentConversationId,
        deleteConversation,
        saveMessage,
        loadMessages,
      }}
    >
      {children}
    </MessageHistoryContext.Provider>
  );
}

export function useMessageHistory() {
  const context = useContext(MessageHistoryContext);
  if (context === undefined) {
    throw new Error('useMessageHistory must be used within a MessageHistoryProvider');
  }
  return context;
}
