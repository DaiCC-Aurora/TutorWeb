import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { type ToolId, TOOL_DEFINITIONS } from '@/lib/tools';

type ChatMode = 'chat' | 'solve' | 'visualize';

// 工具调用最大次数，防止无限循环
const MAX_TOOL_CALLS = 5;

// 获取基础 URL（用于内部 API 调用）
function getBaseUrl(): string {
  // 优先使用环境变量
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // 开发环境使用 localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  // 生产环境从 Host header 构建（需要在请求中传递）
  return '';
}

// 执行 web_search 工具
async function executeWebSearch(query: string, baseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/tools/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      return `搜索失败：${response.statusText}`;
    }
    const result = await response.json();
    if (!result.success) {
      return `搜索失败：${result.error}`;
    }
    // 格式化搜索结果
    const results = result.data?.results || [];
    if (results.length === 0) {
      return '未找到相关搜索结果';
    }
    return '搜索结果:\n' + results.map((r: any, i: number) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   摘要：${r.snippet}`).join('\n\n');
  } catch (error) {
    return `搜索出错：${error instanceof Error ? error.message : '未知错误'}`;
  }
}

// 执行 web_fetch 工具
async function executeWebFetch(url: string, baseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/tools/web-fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      return `网页抓取失败：${response.statusText}`;
    }
    const result = await response.json();
    if (!result.success) {
      return `网页抓取失败：${result.error}`;
    }
    const data = result.data;
    return `从 ${data.url} 获取的内容:\n\n标题：${data.title || '无'}\n\n内容：${data.content}`;
  } catch (error) {
    return `网页抓取出错：${error instanceof Error ? error.message : '未知错误'}`;
  }
}

// 解析 AI 响应中的工具调用
function parseToolCalls(content: string): Array<{ toolId: ToolId; params: any }> {
  const toolCalls: Array<{ toolId: ToolId; params: any }> = [];

  // 使用更健壮的正则表达式来匹配工具调用
  // 支持嵌套的 JSON 对象
  const regex = /\[TOOL:(web_search|ask_user|web_fetch)\]\s*/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const toolId = match[1] as ToolId;
    const startPos = match.index + match[0].length;
    const remaining = content.slice(startPos);

    // 尝试解析 JSON 对象（支持嵌套）
    try {
      // 找到第一个 { 和对应的 }
      let braceCount = 0;
      let endPos = 0;
      let started = false;

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i] === '{') {
          braceCount++;
          started = true;
        } else if (remaining[i] === '}') {
          braceCount--;
        }

        if (started && braceCount === 0) {
          endPos = i + 1;
          break;
        }
      }

      if (endPos > 0) {
        const jsonStr = remaining.slice(0, endPos);
        const params = JSON.parse(jsonStr);
        toolCalls.push({ toolId, params });
      }
    } catch {
      // 忽略解析失败的工具调用
    }
  }

  return toolCalls;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string;
    const sessionId = formData.get('sessionId') as string;
    const mode = (formData.get('mode') as ChatMode) || 'chat';
    // 获取启用的工具列表
    const enabledToolsStr = formData.get('enabledTools') as string | null;
    const enabledTools: ToolId[] = enabledToolsStr
      ? JSON.parse(enabledToolsStr)
      : [];

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // 创建 Supabase 客户端
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
    );

    // 从数据库加载历史消息作为上下文
    let historyMessages: Array<{ role: string; content: string }> = [];
    if (sessionId) {
      try {
        const messagesResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${sessionId}&order=created_at.asc`, {
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY!,
            'authorization': `Bearer ${process.env.SUPABASE_ANON_KEY!}`,
          },
        });
        if (messagesResponse.ok) {
          const messages: Array<{ role: string; content: string }> = await messagesResponse.json();
          historyMessages = messages.slice(-6);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    }

    // 根据模式构建系统提示词
    const systemPrompts: Record<ChatMode, string> = {
      chat: 'You are Aurora Tutor, a helpful AI assistant for general conversations, knowledge queries, and creative discussions.',
      solve: 'You are Aurora Solver, an expert problem-solver. When answering mathematical or logical problems, please:\n1. Break down the problem into clear steps\n2. Show detailed reasoning for each step\n3. Use LaTeX formatting for mathematical expressions (e.g., $x^2 + y^2 = z^2$)\n4. Provide a clear final answer with explanation',
      visualize: 'You are Aurora Visualizer, specialized in creating visual content. When appropriate, you can:\n1. Generate JSON data structures for charts (e.g., {"chartType": "bar", "data": [...], "labels": [...]})\n2. Create HTML/SVG code for interactive visualizations\n3. Describe visualization concepts clearly\n4. Use CSV format for tabular data display',
    };

    // 构建工具提示词
    let toolsPrompt = '';
    if (enabledTools.length > 0) {
      toolsPrompt = '\n\nYou have access to the following tools:\n';
      for (const toolId of enabledTools) {
        const def = TOOL_DEFINITIONS[toolId];
        toolsPrompt += `- ${toolId}: ${def.systemPrompt}\n`;
      }
      toolsPrompt += '\nWhen you need to use a tool, indicate it in your response by writing [TOOL:${toolId}] followed by the parameters in JSON format. For example:\n';
      toolsPrompt += '- For web_search: [TOOL:web_search] {"query": "search term"}\n';
      toolsPrompt += '- For ask_user: [TOOL:ask_user] {"question": "your question"}\n';
      toolsPrompt += '- For web_fetch: [TOOL:web_fetch] {"url": "https://example.com"}\n';
    }

    // 构建消息内容
    const messagesPayload: Array<{ role: string; content: any }> = [
      {
        role: 'system',
        content: [{ type: 'text', text: systemPrompts[mode] + toolsPrompt }],
      },
    ];

    if (historyMessages.length > 0) {
      messagesPayload.push(
        ...historyMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: [{ type: 'text', text: msg.content }]
        }))
      );
    }

    let currentContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: prompt }
    ];

    // 如果有图片，上传到 Supabase Storage
    if (image && image.size > 0) {
      console.log('Processing image:', {
        size: image.size,
        type: image.type,
        name: image.name
      });

      // 生成唯一文件名（使用 .jpg 扩展名）
      const fileName = `${uuidv4()}.jpg`;
      const bucketName = 'ai-images';
      const filePath = `${sessionId || 'temp'}/${fileName}`;

      // 上传图片到 Supabase Storage
      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',  // 强制使用 JPEG
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      console.log('Image uploaded to Supabase:', uploadData.path);

      // 获取公开 URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;
      console.log('Public URL:', imageUrl);

      currentContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    messagesPayload.push({
      role: 'user',
      content: currentContent
    });

    // 获取基础 URL
    const baseUrl = getBaseUrl();

    // 调用 ModelScope API（启用流式响应）
    const callAI = async (msgs: Array<{ role: string; content: any }>) => {
      return fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'Qwen/Qwen2.5-VL-72B-Instruct',
          messages: msgs,
          max_tokens: 4096,
          stream: false, // 工具调用时使用非流式模式
          temperature: mode === 'solve' ? 0.3 : 0.7,
        }),
      });
    };

    // 工具调用循环
    let currentMessages = messagesPayload;
    let finalContent = '';
    let toolCallCount = 0;

    while (toolCallCount < MAX_TOOL_CALLS) {
      const aiResponse = await callAI(currentMessages);

      if (!aiResponse.ok) {
        const errorData = await aiResponse.text();
        console.error('AI API Error:', errorData);
        throw new Error(`API Error: ${aiResponse.status} ${errorData}`);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || '';

      // 检查是否有工具调用
      const toolCalls = parseToolCalls(aiContent);

      if (toolCalls.length === 0) {
        // 没有工具调用，这是最终响应
        finalContent = aiContent;
        break;
      }

      // 有工具调用，执行工具并将结果添加回消息
      toolCallCount++;
      let toolResultText = '\n\n工具调用结果:\n';

      for (const tc of toolCalls) {
        let result = '';
        if (tc.toolId === 'web_search') {
          result = await executeWebSearch(tc.params.query || '', baseUrl);
        } else if (tc.toolId === 'web_fetch') {
          result = await executeWebFetch(tc.params.url || '', baseUrl);
        } else if (tc.toolId === 'ask_user') {
          result = `AI 询问："${tc.params.question}" (请用户在客户端输入回答)`;
        }

        toolResultText += `[${tc.toolId}]: ${result}\n\n`;
      }

      // 将 AI 的原始响应（不含工具标记）和工具结果加入消息历史
      const cleanedContent = aiContent.replace(/\[TOOL:(web_search|ask_user|web_fetch)\]\s*\{[^}]*\}/g, '').trim();
      currentMessages.push({
        role: 'assistant',
        content: [{ type: 'text', text: cleanedContent || '调用工具...' }],
      });
      currentMessages.push({
        role: 'system',
        content: [{ type: 'text', text: `系统：${toolResultText}` }],
      });
    }

    if (toolCallCount >= MAX_TOOL_CALLS) {
      finalContent += '\n\n(工具调用次数已达上限，停止调用)';
    }

    // 将最终响应以流式格式返回
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunk = `data: ${JSON.stringify({
          choices: [{ delta: { content: finalContent } }]
        })}\n\n`;
        controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
