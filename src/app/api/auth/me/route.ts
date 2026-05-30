import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

/**
 * GET /api/auth/me — 检查当前认证状态
 *
 * 读取请求中的 httpOnly Cookie，验证签名和有效期。
 * 返回 { authenticated: boolean }。
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const isValid = await verifyToken(token);

  return NextResponse.json({ authenticated: isValid });
}
