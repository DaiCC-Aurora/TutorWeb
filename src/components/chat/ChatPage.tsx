'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import ChatInput from '@/components/ChatInput';
import MessageList, { type Message } from '@/components/MessageList';
import SidebarShell from '@/components/SidebarShell';
import { useMessageHistory, type Conversation as Conv, type ConversationType } from '@/contexts/MessageHistoryContext';
import { usePassword } from '@/contexts/PasswordContext';
import { compressImage } from '@/lib/image-compressor';
import ModeSelector, { type ChatMode } from './ModeSelector';
import ExportSession from './ExportSession';

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
    createConversation,
    setCurrentConversationId,
    saveMessage,
    loadMessages,
    fetchConversations,
  } = useMessageHistory();

  const { logout } = usePassword();

  // 模式状态
  const [currentMode, setCurrentMode] = useState<ChatMode>('chat');

  // 会话相关状态
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conv | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化时加载会话
  useEffect(() => {
    const targetSessionId = sessionIdFromParams || initialSessionId;
    if (targetSessionId) {
      loadConversationMessages(targetSessionId);
    } else {
      setMessages([]);
      setCurrentConversation(null);
    }
  }, [sessionIdFromParams, initialSessionId]);

  // 监听会话 ID 变化，重新加载消息
  useEffect(() => {
    if (sessionIdFromParams && sessionIdFromParams !== currentConversation?.id) {
      loadConversationMessages(sessionIdFromParams);
    }
  }, [sessionIdFromParams]);

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
      // 根据会话类型推断模式（这里简单使用'chat'作为默认）
      const conversation = conversations.find((c) => c.id === conversationId);
      const inferredMode: 'chat' | 'solve' | 'visualize' =
        conversation?.type === 'co-writer' ? 'chat' : 'chat';

      const convertedMessages: Message[] = savedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
        metadata: {
          hasImage: m.has_image,
          mode: m.role === 'assistant' ? inferredMode : undefined,
        },
      }));
      setMessages(convertedMessages);

      // 获取会话信息
      const conv = conversations.find((c) => c.id === conversationId);
      setCurrentConversation(conv || null);
      setCurrentConversationId(conversationId);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load conversation history');
    }
  };

  const handleNewChat = async () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setMessages([]);
    setCurrentConversation(null);
    setCurrentConversationId(null);
    setCurrentMode('chat');
    setError(null);
    router.push('/chat');
    await fetchConversations('chat');
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
      metadata: { hasImage: !!selectedImage },
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let conversationId = currentConversationId;
      if (!conversationId) {
        // 根据模式生成标题前缀
        const modePrefix = currentMode === 'chat' ? '[Chat]' : currentMode === 'solve' ? '[Solve]' : '[Visualize]';
        conversationId = await createConversation(
          `${modePrefix} ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`,
          'chat' as ConversationType
        );
        setCurrentConversationId(conversationId);
        router.push(`/chat/${conversationId}`);
      }

      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('mode', currentMode);
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
        metadata: { mode: currentMode },
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let buffer = ''; // 行缓冲，处理跨 chunk 的 SSE 事件分割

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // 最后一段可能不完整，保留到下一个 chunk
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || '';
              if (content) {
                accumulatedContent += content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (updated[lastIdx]?.role === 'assistant') {
                    updated[lastIdx] = { ...updated[lastIdx], content: accumulatedContent };
                  }
                  return updated;
                });
              }
            } catch (e) {
              console.warn('SSE parse warning:', e);
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
    <SidebarShell
      title="Aurora Chat"
      titleIcon={
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      }
      headerActions={
        <>
          {currentConversation && (
            <ExportSession
              conversation={currentConversation}
              messages={messages}
            />
          )}
          <button
            onClick={logout}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-surface"
          >
            退出
          </button>
        </>
      }
      onNewChat={handleNewChat}
      currentConversationId={currentConversationId}
      maxWidth="wide"
    >
      {/* 模式选择器 */}
      <section className="flex-shrink-0">
        <ModeSelector
          currentMode={currentMode}
          onChangeMode={(mode) => {
            setCurrentMode(mode);
          }}
        />
      </section>

      {error && (
        <section className="flex-shrink-0">
          <div className="p-3 rounded-lg bg-error-bg/10 border border-error text-error text-sm flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </section>
      )}

      <section className="flex-1 min-h-0 overflow-y-auto bg-bg-card rounded-xl border border-border-light p-3 sm:p-4">
        <MessageList messages={messages} />
        {isLoading && (
          <div className="flex justify-start mt-3">
            <div className="bg-bg-surface dark:bg-bg-card rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

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

      <section className="flex-shrink-0">
        <ChatInput onSubmit={handleAskQuestion} disabled={isLoading} />
      </section>
    </SidebarShell>
  );
}
