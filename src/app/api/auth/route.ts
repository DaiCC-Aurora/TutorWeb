import { NextRequest, NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';

/**
 * POST /api/auth — 密码验证登录
 *
 * 接收密码，服务端比对 APP_PASSWORD，
 * 成功时设置 httpOnly Cookie，失败返回 401。
 */
export async function POST(request: NextRequest) {
  let password: string;
  try {
    const body = await request.json();
    password = body.password;
  } catch {
    return NextResponse.json(
      { error: '请求格式错误，请检查请求数据' },
      { status: 400 }
    );
  }

  try {
    const expectedPassword = process.env.APP_PASSWORD;

    // 如果环境变量未设置，允许访问（开发环境）
    if (!expectedPassword || expectedPassword === 'your_password_here') {
      const token = await createToken();
      const response = NextResponse.json({ authenticated: true });
      setAuthCookie(response, token);
      return response;
    }

    if (password === expectedPassword) {
      const token = await createToken();
      const response = NextResponse.json({ authenticated: true });
      setAuthCookie(response, token);
      return response;
    }

    return NextResponse.json(
      { authenticated: false, error: '密码错误' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: '服务端验证失败，请检查环境变量配置' },
      { status: 500 }
    );
  }
}
