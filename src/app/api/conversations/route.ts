import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET: 获取所有会话列表
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getSupabase()
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch conversations error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取每个会话的最新消息数
    const conversationsWithCount = await Promise.all(
      (data || []).map(async (conv) => {
        const { count } = await getSupabase()
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        return { ...conv, messageCount: count || 0 };
      })
    );

    return NextResponse.json(conversationsWithCount);
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 创建新会话
export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('conversations')
      .insert({ title: title.trim() })
      .select()
      .single();

    if (error) {
      console.error('Supabase create conversation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
