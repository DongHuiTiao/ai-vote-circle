import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

  const authUrl = `${process.env.SECONDME_AUTH_URL}/oauth/authorize?${params}`;

  return NextResponse.redirect(authUrl);
}
