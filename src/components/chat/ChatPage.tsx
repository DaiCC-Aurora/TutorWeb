'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import ChatInput from '@/components/ChatInput';
import MessageList, { type Message } from '@/components/MessageList';
import Sidebar from '@/components/Sidebar';
import PasswordModal from '@/components/PasswordModal';
import { useMessageHistory } from '@/contexts/MessageHistoryContext';
import { usePassword } from '@/contexts/PasswordContext';
import { compressImage } from '@/lib/image-compressor';

interface ChatPageProps {
  initialSessionId?: string;
}

export default function ChatPage({ initialSessionId }: ChatPageProps) {
  const params = useParams();
  const router = useRouter();
  const sessionIdFromParams = params.sessionId as string | undefined;

  const {
    conversations,
    currentConversationId,
    isLoading: contextLoading,
    createConversation,
    setCurrentConversationId,
    saveMessage,
    loadMessages,
    fetchConversations,
  } = useMessageHistory();

  const { isAuthenticated, logout } = usePassword();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化时加载会话
  useEffect(() => {
    const targetSessionId = sessionIdFromParams || initialSessionId;
    if (targetSessionId) {
      loadConversationMessages(targetSessionId);
    } else {
      setMessages([]);
    }
  }, [sessionIdFromParams, initialSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageSelect = async (file: File) => {
    setError(null);
    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], 'image.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      setSelectedImage(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error('Image processing error:', err);
      setError('Failed to process image, please try another image');
      setSelectedImage(null);
      setPreviewUrl(null);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const savedMessages = await loadMessages(conversationId);
      const convertedMessages: Message[] = savedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(convertedMessages);
      setCurrentConversationId(conversationId);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load conversation history');
    }
  };

  // Note: Navigation is now handled by Sidebar component using Next.js Link
  // This function is kept for compatibility but no longer used for navigation

  const handleNewChat = async () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
    router.push('/chat');
    await fetchConversations('chat');
    setSidebarOpen(false);
  };

  const handleAskQuestion = async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = await createConversation(prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''), 'chat');
        setCurrentConversationId(conversationId);
        router.push(`/chat/${conversationId}`);
      }

      const formData = new FormData();
      formData.append('prompt', prompt);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      if (conversationId) {
        formData.append('sessionId', conversationId);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || '';
              accumulatedContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: accumulatedContent };
                }
                return updated;
              });
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      if (conversationId && accumulatedContent) {
        await saveMessage(conversationId, 'user', prompt, !!selectedImage);
        await saveMessage(conversationId, 'assistant', accumulatedContent, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-surface to-bg-card dark:from-bg-sidebar dark:to-bg-primary flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        currentConversationId={currentConversationId}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="sticky top-0 z-10 backdrop-blur-sm bg-bg-card/80 dark:bg-bg-primary/80 border-b border-border-light">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-bg-surface dark:hover:bg-bg-card rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-text-primary">
              Aurora Tutor - Chat
            </h1>
            <button
              onClick={logout}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              退出
            </button>
            {selectedImage && (
              <span className="text-xs sm:text-sm text-text-secondary flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Image attached</span>
                <span className="sm:hidden">📷</span>
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 min-h-0">
          <section className="flex-shrink-0">
            {!previewUrl ? (
              <ImageUploader
                onImageSelect={handleImageSelect}
                onUpload={async () => {}}
              />
            ) : (
              <div className="relative w-full max-w-sm mx-auto">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-bg-surface dark:bg-bg-card border border-border-light">
                  <img
                    src={previewUrl}
                    alt="Selected"
                    className="w-full h-full object-contain"
                  />
                </div>
                <button
                  onClick={handleClearImage}
                  className="mt-2 w-full py-2 text-sm text-error hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  Remove Image
                </button>
              </div>
            )}
          </section>

          {error && (
            <section className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-error-bg text-error text-sm">
                {error}
              </div>
            </section>
          )}

          <section className="flex-1 min-h-0 overflow-y-auto bg-bg-card rounded-xl border border-border-light p-3 sm:p-4">
            <MessageList messages={messages} />
            {isLoading && (
              <div className="flex justify-start mt-3">
                <div className="bg-bg-surface dark:bg-bg-card rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </section>

          <section className="flex-shrink-0">
            <ChatInput onSubmit={handleAskQuestion} disabled={isLoading} />
          </section>
        </main>
      </div>

      {!isAuthenticated && (
        <div className="fixed inset-0 bg-gradient-to-b from-bg-surface to-bg-card dark:from-bg-sidebar dark:to-bg-primary z-50">
          <PasswordModal />
        </div>
      )}
    </div>
  );
}
