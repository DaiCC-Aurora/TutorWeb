import { NextRequest, NextResponse } from 'next/server';

const BING_SEARCH_URL = 'https://www.bing.com/search';

// 模拟浏览器 User-Agent 列表
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

// 解析 Bing 搜索结果 HTML
function parseBingResults(html: string): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // 匹配 Bing 搜索结果条目
  // Bing 的搜索结果结构: <li class="b_algo">...<h2><a href="url">title</a></h2><p>snippet</p></li>
  const liRegex = /<li\s+class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch;

  while ((liMatch = liRegex.exec(html)) !== null) {
    const block = liMatch[1];

    // 提取 URL
    const urlMatch = /<a\s+href="(https?:\/\/[^"]+)"[^>]*>/i.exec(block);
    if (!urlMatch) continue;
    let url = urlMatch[1];

    // 清理 Bing 跳转链接
    if (url.includes('bing.com/ck/a')) {
      // 尝试从 onclick 属性中提取真实 URL
      const onclickMatch = /onclick="[^"]*?"(?:https?:\/\/[^"]+)?"/i.exec(block);
      if (onclickMatch) {
        const directMatch = /https?:\/\/[^"\\]+/i.exec(onclickMatch[0]);
        if (directMatch) {
          url = directMatch[0];
        }
      }
    }

    // 提取标题
    const titleMatch = /<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    if (!title) continue;

    // 提取摘要（可能有 <p> 或 <div class="b_caption"> 两种结构）
    let snippet = '';

    // 尝试标准 <p> 结构
    const pMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
    if (pMatch) {
      snippet = pMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    // 如果 <p> 中没有内容，尝试 <div class="b_caption">
    if (!snippet) {
      const captionMatch = /<div\s+class="b_caption"[^>]*>([\s\S]*?)<\/div>/i.exec(block);
      if (captionMatch) {
        snippet = captionMatch[1].replace(/<[^>]*>/g, '').trim();
      }
    }

    results.push({ title, url, snippet });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // 随机选择一个 User-Agent 以减少被拦截的概率
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    // 使用 Bing 搜索
    const searchUrl = `${BING_SEARCH_URL}?q=${encodeURIComponent(query.trim())}&count=10`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.bing.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`Bing search error: ${response.status}`);
    }

    const html = await response.text();

    // 解析搜索结果
    const results = parseBingResults(html);

    // 如果没有结果，返回提示信息
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          query,
          results: [
            {
              title: 'No results found',
              url: '',
              snippet: `未找到 "${query}" 的相关搜索结果。请尝试更换搜索词。`,
            },
          ],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: results.slice(0, 8),
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