import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { question, sessionId } = await request.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // ask_user 工具主要用于 AI 向用户提问
    // 这里返回一个结构化的响应，告诉前端需要向用户展示问题
    return NextResponse.json({
      success: true,
      data: {
        question,
        sessionId,
        type: 'ask_user',
        // 标记这是一个需要用户响应的请求
        requiresUserInput: true,
      },
    });
  } catch (error) {
    console.error('Ask user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ask user failed',
      },
      { status: 500 }
    );
  }
}