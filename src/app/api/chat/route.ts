import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { CHAT_PROMPTS } from '@/lib/prompts';

type ChatMode = 'chat' | 'solve' | 'visualize';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string;
    const sessionId = formData.get('sessionId') as string;
    const mode = (formData.get('mode') as ChatMode) || 'chat';

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

    // 构建消息内容 — system prompt 从环境变量读取
    const messagesPayload: Array<{ role: string; content: any }> = [
      {
        role: 'system',
        content: [{ type: 'text', text: CHAT_PROMPTS[mode] }],
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

    // 调用 AI API（流式响应）
    const aiResponse = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'Qwen/Qwen2.5-VL-72B-Instruct',
        messages: messagesPayload,
        max_tokens: 4096,
        stream: true,
        temperature: mode === 'solve' ? 0.3 : 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('AI API Error:', errorData);
      throw new Error(`API Error: ${aiResponse.status} ${errorData}`);
    }

    // 将 AI 的流式响应直接透传给客户端
    return new Response(aiResponse.body, {
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
