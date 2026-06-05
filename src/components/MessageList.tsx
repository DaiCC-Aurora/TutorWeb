'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { ReactNode } from 'react';
import 'highlight.js/styles/github-dark.min.css';
import 'katex/dist/katex.min.css';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    mode?: 'chat' | 'solve' | 'visualize';
    hasImage?: boolean;
  };
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
    <div className="relative group my-3">
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

/** CSV 表格展示组件 */
function CSVViewer({ content }: { content: string }) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return null;

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(',').map((cell) => cell.trim()));

  return (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-bg-surface dark:bg-bg-card">
            {headers.map((header, i) => (
              <th key={i} className="border border-border-light px-4 py-2 text-left font-semibold text-text-primary">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-bg-surface/50 dark:hover:bg-bg-card/50">
              {headers.map((_, colIndex) => (
                <td key={`${rowIndex}-${colIndex}`} className="border border-border-light px-4 py-2 text-sm text-text-secondary">
                  {row[colIndex] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** HTML/SVG 内容展示组件 */
function HTMLViewer({ content }: { content: string }) {
  // 检查是否为 SVG 内容
  const isSVG = content.includes('<svg') || content.includes('</svg>');

  if (isSVG) {
    return (
      <div className="my-3 p-4 bg-bg-surface dark:bg-bg-card rounded-lg border border-border-light overflow-auto flex justify-center">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }

  // 简单的 HTML 预览 - 实际项目中应该使用沙箱环境
  return (
    <div className="my-3 p-4 bg-bg-surface dark:bg-bg-card rounded-lg border border-border-light overflow-x-auto">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

/** 步骤式解答展示（Solve 模式） */
function StepByStepSolver({ content }: { content: string }) {
  // 尝试解析步骤标记（如 "步骤 1:"、"Step 1:"、"###" 等）
  const stepRegex = /(?:步骤\s*[一二三四五\d]+|step\s*\d+|###.*?###|\*?\s*\d+\.\s+)/gi;
  const steps = content.split(stepRegex).filter(Boolean);

  if (steps.length < 2) {
    return null;
  }

  const formattedSteps: string[] = [];
  for (let i = 0; i < steps.length; i += 2) {
    if (i + 1 < steps.length) {
      formattedSteps.push(steps[i + 1]);
    }
  }

  if (formattedSteps.length < 2) return null;

  return (
    <div className="my-3 space-y-3">
      {formattedSteps.map((step, index) => (
        <div
          key={index}
          className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-purple-500 text-white rounded-full text-sm font-bold">
              {index + 1}
            </span>
            <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {step}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 图表可视化容器（占位符，后续可扩展 Chart.js/Recharts） */
function ChartViewer({ chartData }: { chartData: string }) {
  // 解析简单的图表定义
  try {
    const data = JSON.parse(chartData);
    return (
      <div className="my-3 p-4 bg-bg-surface dark:bg-bg-card rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-center text-green-700 dark:text-green-400 mb-4">
          📊 图表可视化区域
        </div>
        <pre className="text-xs text-text-secondary overflow-x-auto">{chartData}</pre>
      </div>
    );
  } catch {
    return null;
  }
}

/** 自定义 Markdown 渲染组件映射 */
const markdownComponents: any = {
  code({ node, className, children, ...props }: any) {
    const isInline = !className?.includes('language-');
    const match = /language-(\w+)/.exec(className || '');
    if (isInline) {
      return <code className="inline-code" {...props}>{children}</code>;
    }
    return <CodeBlock language={match?.[1]}>{children}</CodeBlock>;
  },
  pre({ children }: any) {
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

/** 检测消息内容类型并返回相应渲染器 */
function detectContentType(content: string, mode?: 'chat' | 'solve' | 'visualize'): { type: 'markdown' | 'csv' | 'html' | 'chart' | 'stepbystep'; data: any } {
  const trimmed = content.trim();

  // 检查是否为 CSV（至少两行，逗号分隔）
  const lines = trimmed.split('\n');
  if (lines.length >= 2 && lines.every((line) => line.includes(','))) {
    return { type: 'csv', data: trimmed };
  }

  // 检查代码块中的 SVG 内容（AI 通常将 SVG 包裹在 ```svg 或 ```xml 代码块中）
  const svgCodeBlockMatch = trimmed.match(/```(?:svg|xml|html)\s*\n([\s\S]*?)```/i);
  if (svgCodeBlockMatch) {
    const codeContent = svgCodeBlockMatch[1];
    const svgExtract = codeContent.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgExtract) {
      return { type: 'html', data: svgExtract[0] };
    }
  }
  // 检查纯 SVG 内容（没有代码块包裹）
  if (!trimmed.includes('```')) {
    const svgExtract = trimmed.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgExtract) {
      return { type: 'html', data: svgExtract[0] };
    }
  }
  // 检查是否为完整 HTML 文档（排除 SVG，因为上面已处理）
  const looksLikeHtml = /^<(html|!DOCTYPE|body|table|article|section|main)\b/i.test(trimmed) ||
    (/^<\w+[^>]*>[\s\S]*<\/\w+>$/.test(trimmed) && !trimmed.includes('```'));
  if (looksLikeHtml) {
    return { type: 'html', data: trimmed };
  }

  // 检查是否为图表 JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}') && (trimmed.includes('"chartType"') || trimmed.includes('"data"'))) {
    try {
      JSON.parse(trimmed);
      return { type: 'chart', data: trimmed };
    } catch {
      // Not valid JSON
    }
  }

  // Solve 模式 - 分步推理（更严格的检测）
  const stepPatterns = [
    /步骤\s*[一二三四五\d]+:/i,           // 步骤 1:
    /步骤\s*[一二三四五\d]+．/i,           // 步骤一。
    /Step\s*\d+[:\.]?\s*/i,                // Step 1: 或 Step 1.
    /^\d+\.\s+[A-Z]/i,                     // 1. First...
    /^###\s*步骤/i,                        // ### 步骤
    /第\s*[一二三四五\d]+步\s*[:.:]/i,     // 第一步：
  ];

  const isStepByStep = stepPatterns.some(pattern => pattern.test(trimmed));
  if (isStepByStep) {
    return { type: 'stepbystep', data: trimmed };
  }

  return { type: 'markdown', data: trimmed };
}

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
                {/* 检测内容类型并渲染对应组件 */}
                {(() => {
                  const mode = message.metadata?.mode;
                  const { type, data } = detectContentType(message.content, mode);

                  switch (type) {
                    case 'csv':
                      return <CSVViewer content={data} />;
                    case 'html':
                      return <HTMLViewer content={data} />;
                    case 'chart':
                      return <ChartViewer chartData={data} />;
                    case 'stepbystep':
                      return (
                        <>
                          <StepByStepSolver content={data} />
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </>
                      );
                    default:
                      return (
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeKatex, rehypeHighlight]}
                          components={markdownComponents}
                        >
                          {message.content}
                        </ReactMarkdown>
                      );
                  }
                })()}
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
