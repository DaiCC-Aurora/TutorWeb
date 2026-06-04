'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MessageList, { type Message } from '@/components/MessageList';
import Sidebar from '@/components/Sidebar';
import PasswordModal from '@/components/PasswordModal';
import { useMessageHistory } from '@/contexts/MessageHistoryContext';
import { usePassword } from '@/contexts/PasswordContext';

// 提示词模板类型
type PromptTemplate = 'chinese' | 'english-basic' | 'continue-writing';
// 改写操作类型
type RewriteAction = 'rewrite' | 'rephrase' | 'expand' | 'condense';

interface CoWriterPageProps {
  initialSessionId?: string;
}

// 提示词模板配置
const PROMPT_TEMPLATES: Record<PromptTemplate, { label: string; systemPrompt: string }> = {
  'chinese': {
    label: '语文',
    systemPrompt: '你是一位专业的语文写作辅导老师。请帮助学生提高中文写作能力，包括作文结构、修辞手法、文字表达等方面。提供具体的修改建议和范文参考。',
  },
  'english-basic': {
    label: '英语基础性写作',
    systemPrompt: 'You are an English writing tutor. Help students improve their basic English writing skills, including grammar, vocabulary, sentence structure, and paragraph organization. Provide clear explanations and examples.',
  },
  'continue-writing': {
    label: '读后续写',
    systemPrompt: '你是一位专业的读后续写辅导老师。请根据给定的文章开头，帮助学生构思合理的故事发展，保持人物性格一致，情节连贯，语言风格统一。提供写作思路和范文参考。',
  },
};

// 改写操作配置
const REWRITE_ACTIONS: Record<RewriteAction, { label: string; prompt: string }> = {
  'rewrite': { label: '重写', prompt: '请重新写作以下内容，保持原意但使用不同的表达方式：' },
  'rephrase': { label: '改写', prompt: '请对以下内容进行同义改写和润色，使其更加流畅优美：' },
  'expand': { label: '扩展', prompt: '请扩展以下内容，添加更多细节和描述：' },
  'condense': { label: '精简', prompt: '请精简以下内容，保留核心信息，去除冗余：' },
};

export default function CoWriterPage({ initialSessionId }: CoWriterPageProps) {
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

  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate>('chinese');
  const [inputText, setInputText] = useState('');
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

  const handleNewChat = async () => {
    setInputText('');
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
    router.push('/co-writer');
    await fetchConversations('co-writer');
    setSidebarOpen(false);
  };

  const handleSubmit = async (action?: RewriteAction) => {
    if (!inputText.trim()) {
      setError('请输入需要处理的文本内容');
      return;
    }

    setIsLoading(true);
    setError(null);

    const template = PROMPT_TEMPLATES[selectedTemplate];
    let userPrompt: string;

    if (action) {
      userPrompt = `${REWRITE_ACTIONS[action].prompt}\n\n${inputText}`;
    } else {
      userPrompt = inputText;
    }

    const userMessage: Message = {
      role: 'user',
      content: userPrompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let conversationId = currentConversationId;
      if (!conversationId) {
        const title = inputText.slice(0, 30) + (inputText.length > 30 ? '...' : '');
        conversationId = await createConversation(`${template.label} - ${title}`, 'co-writer');
        setCurrentConversationId(conversationId);
        router.push(`/co-writer/${conversationId}`);
      }

      const formData = new FormData();
      formData.append('prompt', userPrompt);
      formData.append('systemPrompt', template.systemPrompt);
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
        await saveMessage(conversationId, 'user', userPrompt, false);
        await saveMessage(conversationId, 'assistant', accumulatedContent, false);
      }

      // 清空输入框
      setInputText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleDirectSubmit = () => handleSubmit();

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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-bg-surface dark:hover:bg-bg-card rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-text-primary">
              Aurora Co-Writer
            </h1>
            <button
              onClick={logout}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              退出
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 min-h-0">
          {/* 提示词模板选择 */}
          <section className="flex-shrink-0">
            <div className="bg-bg-card rounded-xl border border-border-light p-4">
              <h2 className="text-sm font-semibold text-text-primary mb-3">选择提示词模板</h2>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PROMPT_TEMPLATES) as PromptTemplate[]).map((template) => (
                  <button
                    key={template}
                    onClick={() => setSelectedTemplate(template)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedTemplate === template
                        ? 'bg-accent text-white'
                        : 'bg-bg-surface text-text-secondary hover:bg-bg-surface-hover border border-border-light'
                    }`}
                  >
                    {PROMPT_TEMPLATES[template].label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 文本输入区域 */}
          <section className="flex-shrink-0">
            <div className="bg-bg-card rounded-xl border border-border-light p-4">
              <h2 className="text-sm font-semibold text-text-primary mb-3">输入文本</h2>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请输入需要写作、改写或润色的文本内容..."
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-border-medium bg-bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />

              {/* 改写操作按钮 */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={handleDirectSubmit}
                  disabled={isLoading || !inputText.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-text-tertiary text-white rounded-lg font-medium transition-colors text-sm"
                >
                  提交
                </button>
                {(Object.keys(REWRITE_ACTIONS) as RewriteAction[]).map((action) => (
                  <button
                    key={action}
                    onClick={() => handleSubmit(action)}
                    disabled={isLoading || !inputText.trim()}
                    className="px-4 py-2 bg-bg-surface hover:bg-bg-surface-hover disabled:bg-text-tertiary text-text-secondary rounded-lg font-medium transition-colors text-sm border border-border-light"
                  >
                    {REWRITE_ACTIONS[action].label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 错误提示 */}
          {error && (
            <section className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-error-bg text-error text-sm">
                {error}
              </div>
            </section>
          )}

          {/* 消息列表 */}
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
