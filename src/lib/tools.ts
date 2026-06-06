// 工具定义 - 用于 AI 调用的内置工具
// systemPrompt 从环境变量读取（参见 prompts.ts）

import { TOOL_PROMPTS } from '@/lib/prompts';

export type ToolId = 'web_search' | 'ask_user' | 'web_fetch';

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// 工具配置定义
export const TOOL_DEFINITIONS: Record<ToolId, {
  name: string;
  description: string;
  systemPrompt: string;
}> = {
  web_search: {
    name: '网络搜索',
    description: '当需要查询实时信息、最新事件或网络内容时使用',
    systemPrompt: TOOL_PROMPTS.web_search,
  },
  ask_user: {
    name: '询问用户',
    description: '当需要用户提供额外信息或澄清时使用',
    systemPrompt: TOOL_PROMPTS.ask_user,
  },
  web_fetch: {
    name: '网页抓取',
    description: '当需要获取特定网页的内容时使用',
    systemPrompt: TOOL_PROMPTS.web_fetch,
  },
};

// 工具调用结果类型
export interface WebSearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface AskUserResult {
  question: string;
  answer?: string;
}

export interface WebFetchResult {
  url: string;
  content: string;
  title?: string;
}