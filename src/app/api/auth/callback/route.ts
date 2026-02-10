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
    // 注意：必须使用 application/x-www-form-urlencoded 格式
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SECONDME_REDIRECT_URI!,
      client_id: process.env.SECONDME_CLIENT_ID!,
      client_secret: process.env.SECONDME_CLIENT_SECRET!,
    });

    const tokenResponse = await fetch(
      `${process.env.SECONDME_API_BASE_URL}/api/oauth/token/code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to exchange token: ${tokenResponse.status}`);
    }

    const tokenResult = await tokenResponse.json();

    console.log('Token response:', JSON.stringify(tokenResult, null, 2));

    // SecondMe API 响应格式：{ code: 0, data: { accessToken, refreshToken, expiresIn, ... } }
    if (tokenResult.code !== 0) {
      throw new Error(`Token error: ${tokenResult.message || 'Unknown error'}`);
    }

    const tokenData = tokenResult.data;
    console.log('Token data received:', { hasAccessToken: !!tokenData.accessToken, expiresIn: tokenData.expiresIn });

    // 获取用户信息
    const userResponse = await fetch(
      `${process.env.SECONDME_API_BASE_URL}/api/secondme/user/info`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();

    console.log('User info response:', JSON.stringify(userData, null, 2));

    if (userData.code !== 0) {
      throw new Error('Invalid user data response');
    }

    const userInfo = userData.data;
    console.log('User info:', { userId: userInfo.userId, email: userInfo.email });

    // 查找或创建用户
    const user = await prisma.user.upsert({
      where: { secondmeUserId: userInfo.userId },
      update: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
      },
      create: {
        secondmeUserId: userInfo.userId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
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
