import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // 抓取网页内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AuroraTutor/1.0; +https://aurora.tutor)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // 设置超时限制
      signal: AbortSignal.timeout(10000), // 10 秒超时
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // 只处理 HTML 内容
    if (!contentType.includes('text/html')) {
      return NextResponse.json({
        success: false,
        error: 'URL does not return HTML content',
      });
    }

    const html = await response.text();

    // 简单提取文本内容（去除 HTML 标签）
    // 注意：这是一个简单的实现，生产环境可以使用更专业的解析库
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // 移除 script 和 style 标签内容
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

    // 提取文本
    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 限制内容长度
    const maxLength = 5000;
    if (content.length > maxLength) {
      content = content.slice(0, maxLength) + '... [内容已截断]';
    }

    return NextResponse.json({
      success: true,
      data: {
        url,
        title,
        content,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Web fetch error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { success: false, error: 'Request timed out (10s)' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      },
      { status: 500 }
    );
  }
}