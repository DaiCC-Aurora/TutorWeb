import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET: 获取会话列表，支持按 type 过滤
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'chat' | 'co-writer'

    let query = getSupabase()
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    // 如果指定了 type，按类型过滤
    if (type && (type === 'chat' || type === 'co-writer')) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

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

// POST: 创建新会话，支持指定 type
export async function POST(request: NextRequest) {
  try {
    const { title, type } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // type 默认为 'chat'，只允许合法值
    const conversationType = (type === 'chat' || type === 'co-writer') ? type : 'chat';

    const { data, error } = await getSupabase()
      .from('conversations')
      .insert({ title: title.trim(), type: conversationType })
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