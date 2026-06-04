// 工具定义 - 用于 AI 调用的内置工具

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
    systemPrompt: 'When you need to find current information, latest events, or web content, you can use the web_search tool. Format your search query clearly and concisely.',
  },
  ask_user: {
    name: '询问用户',
    description: '当需要用户提供额外信息或澄清时使用',
    systemPrompt: 'When you need additional information from the user or need to clarify something, you can use the ask_user tool. Ask clear, specific questions.',
  },
  web_fetch: {
    name: '网页抓取',
    description: '当需要获取特定网页的内容时使用',
    systemPrompt: 'When you need to fetch content from a specific URL, you can use the web_fetch tool. Provide the URL you want to fetch.',
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