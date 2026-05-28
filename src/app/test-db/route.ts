import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 测试查询 conversations 表（应该为空但不应报错）
    const { data, error: convError } = await getSupabase()
      .from('conversations')
      .select('*', { count: 'exact' })
      .limit(1);

    if (convError) {
      console.error('Supabase test error:', convError);
      return NextResponse.json({
        success: false,
        error: convError.message,
        details: '表不存在或 RLS 策略阻止访问，请先运行数据库迁移',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase 连接正常',
      conversationCount: data?.length || 0,
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
