import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();

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

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      // 只保存同源的路径，避免保存外部网站的路径
      if (refererUrl.origin === request.nextUrl.origin) {
        returnPath = refererUrl.pathname + refererUrl.search;
      }
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
