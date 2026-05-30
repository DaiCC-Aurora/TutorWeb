import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

/**
 * 中间件 — API 路由认证保护
 *
 * 对 /api/* 下的所有非认证路由进行 Cookie 校验，
 * 防止未授权用户直接调用 API 获取数据。
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 白名单：认证相关路由不拦截 ──
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // ── 保护其他 API 路由 ──
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: '未认证，请先输入访问密码' },
        { status: 401 }
      );
    }

    const isValid = await verifyToken(token);

    if (!isValid) {
      return NextResponse.json(
        { error: '认证已过期，请重新输入访问密码' },
        { status: 401 }
      );
    }
  }

  // ── 页面路由放行（客户端通过 /api/auth/me 控制 UI） ──
  return NextResponse.next();
}

/**
 * 只对 API 路由生效，跳过 _next/static、_next/image、favicon 等
 */
export const config = {
  matcher: '/api/:path*',
};
