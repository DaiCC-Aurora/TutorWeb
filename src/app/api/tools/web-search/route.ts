import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // 使用 DuckDuckGo Instant Answer API 进行搜索（无需 API 密钥）
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'AuroraTutor/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }

    const data = await response.json();

    // 解析搜索结果
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // 添加主要摘要（如果有）
    if (data.AbstractText) {
      results.push({
        title: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL || '',
        snippet: data.AbstractText,
      });
    }

    // 添加相关主题
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related',
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    // 如果没有结果，返回提示信息
    if (results.length === 0) {
      results.push({
        title: 'No results found',
        url: '',
        snippet: `No instant answers found for "${query}". Try a different search term.`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        results,
      },
    });
  } catch (error) {
    console.error('Web search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}