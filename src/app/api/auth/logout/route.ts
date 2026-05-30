import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

/**
 * POST /api/auth/logout — 登出
 *
 * 清除 httpOnly Cookie。
 */
export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  clearAuthCookie(response);
  return response;
}
