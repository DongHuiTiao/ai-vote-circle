import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();

  // 调试日志
  authLogger.info('OAuth login initiated', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    host: request.headers.get('host'),
    xForwardedHost: request.headers.get('x-forwarded-host'),
    xForwardedProto: request.headers.get('x-forwarded-proto'),
    redirectUri: process.env.SECONDME_REDIRECT_URI,
  });

  const cookieStore = await cookies();

  // 保存 state 到 cookie 用于验证
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 分钟
  });

  // 保存登录前的页面路径，用于登录后返回
  // 从 Referer 头获取来源页面
  const referer = request.headers.get('referer');
  let returnPath = '/';

  authLogger.info('Login request', {
    referer,
  });

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      // 保存完整路径（不需要验证同源，因为 referer 已经是浏览器发送的真实来源）
      returnPath = refererUrl.pathname + refererUrl.search;
      authLogger.info('Return path extracted from referer', {
        returnPath,
        refererHost: refererUrl.host,
        refererPathname: refererUrl.pathname,
        refererSearch: refererUrl.search,
      });
    } catch (e) {
      authLogger.warn('Failed to parse referer URL', {
        error: e instanceof Error ? e.message : String(e),
        referer,
      });
      // 如果解析失败，使用默认路径
    }
  }

  cookieStore.set('return_path', returnPath, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 分钟
  });

  const params = new URLSearchParams({
    client_id: process.env.SECONDME_CLIENT_ID!,
    redirect_uri: process.env.SECONDME_REDIRECT_URI!,
    response_type: 'code',
    scope: [
      'user.info',
      'user.info.shades',
      'user.info.softmemory',
      'chat',
      'note.add',
    ].join(' '),
    state,
  });

  const authUrl = `${process.env.SECONDME_AUTH_URL}/?${params}`;

  return NextResponse.redirect(authUrl);
}
