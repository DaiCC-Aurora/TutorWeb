'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ReactNode } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
}

/** 代码块组件：显示语言标签，支持一键复制 */
function CodeBlock({ language, children }: { language?: string; children: ReactNode }) {
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for environments without clipboard API
    }
  };

  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-text-secondary bg-black/5 dark:bg-white/5 rounded-t-lg border-b border-border-light">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"
          aria-label="复制代码"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none"><code>{code}</code></pre>
    </div>
  );
}

/** 自定义 Markdown 渲染组件映射 */
const markdownComponents = {
  code({ node, className, children, ...props }: any) {
    const isInline = !className?.includes('language-');
    const match = /language-(\w+)/.exec(className || '');
    if (isInline) {
      return <code className="inline-code" {...props}>{children}</code>;
    }
    return <CodeBlock language={match?.[1]}>{children}</CodeBlock>;
  },
  pre({ children }: any) {
    // If the <pre> contains only our <CodeBlock>, let CodeBlock handle it
    const child = children?.[0] || children;
    if (child?.type === CodeBlock || child?.props?.className === 'inline-code') {
      return <>{children}</>;
    }
    return <pre className="code-pre">{children}</pre>;
  },
  table({ children }: any) {
    return <div className="table-wrapper"><table>{children}</table></div>;
  },
};

export default function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm sm:text-base">
        上传图片并提问，或直接输入问题开始对话
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3
                       ${message.role === 'user'
                         ? 'bg-user-bubble text-user-bubble-text'
                         : 'bg-ai-bubble text-ai-bubble-text'
                       }`}
          >
            {message.role === 'assistant' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
            <p
              className={`text-xs mt-1 ${
                message.role === 'user'
                  ? 'text-user-bubble-text/70'
                  : 'text-text-secondary'
              }`}
            >
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
