/**
 * 认证工具库
 *
 * 使用 httpOnly Cookie + HMAC 签名进行服务端认证。
 * 支持 Edge Runtime（middleware）和 Node.js Runtime（API Routes）。
 */
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'auth_token';

/** Token 有效期 24 小时 */
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.APP_AUTH_SECRET || process.env.APP_PASSWORD || '';
}

function requireSecret(): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error(
      'Missing APP_PASSWORD or APP_AUTH_SECRET environment variable.'
    );
  }
  return secret;
}

async function getHmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const secret = getSecret() || 'dev-fallback-key-for-local-only';
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

/** 将 Uint8Array 编码为 base64url 字符串 */
function base64urlEncode(data: Uint8Array | ArrayBuffer): string {
  const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** 将 base64url 字符串解码为 ArrayBuffer（兼容 BufferSource） */
function base64urlDecode(str: string): ArrayBuffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const decoded = atob(str);
  const buffer = new ArrayBuffer(decoded.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < decoded.length; i++) {
    arr[i] = decoded.charCodeAt(i);
  }
  return buffer;
}

/**
 * 创建已签名的认证 token。
 * 格式：base64url(payload) + '.' + base64url(signature)
 */
export async function createToken(): Promise<string> {
  const payload = JSON.stringify({
    authenticated: true,
    exp: Date.now() + TOKEN_EXPIRY_MS,
    nonce: crypto.randomUUID(),
  });

  const payloadBytes = new TextEncoder().encode(payload);
  const key = await getHmacKey('sign');
  const signature = await crypto.subtle.sign('HMAC', key, payloadBytes);

  return base64urlEncode(payloadBytes) + '.' + base64urlEncode(signature);
}

/**
 * 验证 token 的签名和有效期。
 * 返回 true 表示有效，false 表示无效/过期/篡改。
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [payloadB64, signatureB64] = parts;
    const payloadBytes = base64urlDecode(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

    // 检查有效期
    if (!payload.authenticated || Date.now() > payload.exp) {
      return false;
    }

    // 验证 HMAC 签名
    const key = await getHmacKey('verify');
    return await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(signatureB64),
      payloadBytes
    );
  } catch {
    return false;
  }
}

/** 在 NextResponse 上设置 httpOnly Cookie */
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_EXPIRY_MS / 1000,
  });
}

/** 清除 httpOnly Cookie（登出） */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export { COOKIE_NAME };
