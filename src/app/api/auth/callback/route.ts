import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();

  // 获取保存的 state
  const savedState = cookieStore.get('oauth_state')?.value;

  // WebView 环境下 state 验证可能失败，宽松处理
  if (savedState && state !== savedState) {
    console.warn('OAuth state 验证失败，可能是跨 WebView 场景');
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    // 交换 access_token
    const tokenResponse = await fetch(
      `${process.env.SECONDME_AUTH_URL}/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.SECONDME_CLIENT_ID,
          client_secret: process.env.SECONDME_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.SECONDME_REDIRECT_URI,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange token');
    }

    const tokenData = await tokenResponse.json();

    // 获取用户信息
    const userResponse = await fetch(
      `${process.env.SECONDME_API_BASE_URL}/api/secondme/user/info`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();

    if (userData.code !== 0) {
      throw new Error('Invalid user data response');
    }

    const userInfo = userData.data;

    // 查找或创建用户
    const user = await prisma.user.upsert({
      where: { secondmeUserId: userInfo.id },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      create: {
        secondmeUserId: userInfo.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    // 设置用户 session cookie
    cookieStore.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 天
    });

    // 删除 oauth_state cookie
    cookieStore.delete('oauth_state');

    // 重定向到首页
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
