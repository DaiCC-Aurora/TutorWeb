'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MessageList, { type Message } from '@/components/MessageList';
import SidebarShell from '@/components/SidebarShell';
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
const PROMPT_TEMPLATES: Record<PromptTemplate, {
  label: string;
  description: string;
  icon: React.ReactNode;
  systemPrompt: string;
}> = {
  'chinese': {
    label: '语文',
    description: '作文结构、修辞手法、文字表达辅导',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    systemPrompt: '你是一位专业的语文写作辅导老师。请帮助学生提高中文写作能力，包括作文结构、修辞手法、文字表达等方面。提供具体的修改建议和范文参考。',
  },
  'english-basic': {
    label: '英语写作',
    description: '语法、词汇、句式结构基础训练',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    systemPrompt: 'You are an English writing tutor. Help students improve their basic English writing skills, including grammar, vocabulary, sentence structure, and paragraph organization. Provide clear explanations and examples.',
  },
  'continue-writing': {
    label: '读后续写',
    description: '故事构思、情节发展、语言风格统一',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    systemPrompt: '你是一位专业的读后续写辅导老师。请根据给定的文章开头，帮助学生构思合理的故事发展，保持人物性格一致，情节连贯，语言风格统一。提供写作思路和范文参考。',
  },
};

// 改写操作配置
const REWRITE_ACTIONS: Record<RewriteAction, {
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}> = {
  'rewrite': {
    label: '重写',
    description: '重新写作，保持原意换表达方式',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    prompt: '请重新写作以下内容，保持原意但使用不同的表达方式：',
  },
  'rephrase': {
    label: '改写',
    description: '同义改写，润色文字使其更流畅',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    prompt: '请对以下内容进行同义改写和润色，使其更加流畅优美：',
  },
  'expand': {
    label: '扩展',
    description: '添加细节和描述，丰富内容',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    prompt: '请扩展以下内容，添加更多细节和描述：',
  },
  'condense': {
    label: '精简',
    description: '去除冗余，保留核心信息',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    prompt: '请精简以下内容，保留核心信息，去除冗余：',
  },
};

export default function CoWriterPage({ initialSessionId }: CoWriterPageProps) {
  const params = useParams();
  const router = useRouter();
  const sessionIdFromParams = params.sessionId as string | undefined;

  const {
    currentConversationId,
    createConversation,
    setCurrentConversationId,
    saveMessage,
    loadMessages,
    fetchConversations,
  } = useMessageHistory();

  const { logout } = usePassword();

  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate>('chinese');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(180, textareaRef.current.scrollHeight)}px`;
    }
  }, [inputText]);

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

  const handleNewChat = async () => {
    setInputText('');
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
    router.push('/co-writer');
    await fetchConversations('co-writer');
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
    setInputText('');

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
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDirectSubmit();
    }
  };

  return (
    <SidebarShell
      title="Aurora Co-Writer"
      titleIcon={
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      }
      headerActions={
        <button
          onClick={logout}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-surface"
        >
          退出
        </button>
      }
      onNewChat={handleNewChat}
      currentConversationId={currentConversationId}
    >
      {/* 提示词模板选择 */}
      <section className="flex-shrink-0">
        <div className="bg-bg-card rounded-xl border border-border-light p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">选择写作模式</h2>
            <span className="text-xs text-text-secondary">{PROMPT_TEMPLATES[selectedTemplate].description}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(PROMPT_TEMPLATES) as PromptTemplate[]).map((templateKey) => {
              const template = PROMPT_TEMPLATES[templateKey];
              const isActive = selectedTemplate === templateKey;
              return (
                <button
                  key={templateKey}
                  onClick={() => setSelectedTemplate(templateKey)}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                    isActive
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-border-light bg-bg-surface hover:border-accent/50 hover:bg-bg-surface-hover'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'
                  }`}>
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-text-primary">{template.label}</div>
                    <div className="text-xs text-text-secondary mt-0.5 line-clamp-1">{template.description}</div>
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 文本输入区域 */}
      <section className="flex-shrink-0">
        <div className="bg-bg-card rounded-xl border border-border-light p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">输入内容</h2>
            <span className="text-xs text-text-secondary">{inputText.length} 字符</span>
          </div>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入需要写作、改写或润色的文本内容...&#10;按 Enter 提交，Shift + Enter 换行"
            className="w-full px-3 py-3 rounded-lg border border-border-medium bg-bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none transition-shadow"
          />

          {/* 改写操作按钮 */}
          <div className="mt-4 pt-4 border-t border-border-light">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(REWRITE_ACTIONS) as RewriteAction[]).map((action) => (
                  <button
                    key={action}
                    onClick={() => handleSubmit(action)}
                    disabled={isLoading || !inputText.trim()}
                    className="group relative flex items-center gap-2 px-3 py-2 bg-bg-surface hover:bg-bg-surface-hover disabled:bg-text-tertiary/10 disabled:cursor-not-allowed text-text-secondary rounded-lg font-medium transition-all text-sm border border-border-light hover:border-accent/30"
                  >
                    {REWRITE_ACTIONS[action].icon}
                    <span>{REWRITE_ACTIONS[action].label}</span>
                    <span className="hidden group-hover:inline-flex absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {REWRITE_ACTIONS[action].description}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleDirectSubmit}
                disabled={isLoading || !inputText.trim()}
                className="w-full sm:w-auto px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-text-tertiary/30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md text-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    处理中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    直接提交
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 错误提示 */}
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

      {/* 消息列表 */}
      <section className="flex-1 min-h-0 overflow-y-auto bg-bg-card rounded-xl border border-border-light">
        <MessageList messages={messages} />
        {isLoading && messages.length > 0 && (
          <div className="flex justify-start p-4">
            <div className="bg-bg-surface dark:bg-bg-card rounded-2xl px-4 py-3 border border-border-light">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <svg className="w-16 h-16 text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-text-secondary text-sm">开始你的写作之旅吧！</p>
            <p className="text-text-tertiary text-xs mt-1">选择一个写作模式，输入你的内容</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>
    </SidebarShell>
  );
}
