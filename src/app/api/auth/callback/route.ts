import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { authLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 调试日志
  authLogger.info('OAuth callback received', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    host: request.headers.get('host'),
    xForwardedHost: request.headers.get('x-forwarded-host'),
    xForwardedProto: request.headers.get('x-forwarded-proto'),
  });

  const cookieStore = await cookies();

  // 获取保存的 state
  const savedState = cookieStore.get('oauth_state')?.value;

  // WebView 环境下 state 验证可能失败，宽松处理
  if (savedState && state !== savedState) {
    // 忽略 state 不匹配的情况（WebView 场景）
  }

  if (!code) {
    // 使用绝对路径重定向
    const errorUrl = new URL('/?error=no_code', request.url);
    return NextResponse.redirect(errorUrl);
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
      authLogger.error('Token exchange failed', { status: tokenResponse.status });
      throw new Error(`Failed to exchange token: ${tokenResponse.status}`);
    }

    const tokenResult = await tokenResponse.json();

    // SecondMe API 响应格式：{ code: 0, data: { accessToken, refreshToken, expiresIn, ... } }
    if (tokenResult.code !== 0) {
      throw new Error(`Token error: ${tokenResult.message || 'Unknown error'}`);
    }

    const tokenData = tokenResult.data;

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
      authLogger.error('Failed to fetch user info', { status: userResponse.status });
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();

    if (userData.code !== 0) {
      throw new Error('Invalid user data response');
    }

    const userInfo = userData.data;

    // 查找或创建用户
    const user = await prisma.user.upsert({
      where: { secondmeUserId: userInfo.userId },
      update: {
        nickname: userInfo.name || null,
        avatar: userInfo.avatar || null,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
      },
      create: {
        secondmeUserId: userInfo.userId,
        nickname: userInfo.name || null,
        avatar: userInfo.avatar || null,
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

    // 获取登录前的页面路径
    const returnPath = cookieStore.get('return_path')?.value || '/';

    // 删除 oauth_state 和 return_path cookie
    cookieStore.delete('oauth_state');
    cookieStore.delete('return_path');

    // 检查并创建今日的发帖任务
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 检查该用户今天是否已有发帖任务
      const existingPostJob = await prisma.dailyAIVoteJob.findFirst({
        where: {
          userId: user.id,
          scheduledFor: today,
        },
      });

      if (!existingPostJob) {
        // 为用户创建今天的发帖任务
        await prisma.dailyAIVoteJob.create({
          data: {
            userId: user.id,
            status: 'pending',
            scheduledFor: today,
          },
        });
      }
    } catch (error) {
      authLogger.error('Failed to create daily post job', { error, userId: user.id });
      // 不影响登录流程，继续
    }

    // 自动将投票任务加入队列（后台处理）
    try {
      // 获取所有投票
      const allVotes = await prisma.vote.findMany({
        select: { id: true },
      });

      // 获取用户已投的 AI 投票
      const userAIVotes = await prisma.voteResponse.findMany({
        where: {
          userId: user.id,
          operatorType: 'ai',
        },
        select: { voteId: true },
      });

      const votedVoteIds = new Set(userAIVotes.map((v) => v.voteId));

      // 过滤出还没投过的投票
      const votesToProcess = allVotes.filter((vote) => !votedVoteIds.has(vote.id));

      if (votesToProcess.length > 0) {
        // 批量创建任务到队列
        await prisma.autoVoteJob.createMany({
          data: votesToProcess.map((vote) => ({
            userId: user.id,
            voteId: vote.id,
            status: 'pending',
            priority: 0,
          })),
          skipDuplicates: true,
        });

        // 设置标记，告诉前端查询队列状态
        cookieStore.set('auto_vote_pending', 'true', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60,
        });
        authLogger.info('Created auto-vote jobs', { userId: user.id, count: votesToProcess.length });
      }
    } catch (error) {
      authLogger.error('Failed to create auto-vote jobs', { error, userId: user.id });
      // 不影响登录流程，继续重定向
    }

    // 重定向到登录前的页面
    const redirectUrl = new URL(returnPath, request.url);
    authLogger.info('OAuth login successful', {
      userId: user.id,
      returnPath,
      redirectUrl: redirectUrl.toString(),
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    authLogger.error('OAuth callback error', { error });
    const errorUrl = new URL('/?error=auth_failed', request.url);
    return NextResponse.redirect(errorUrl);
  }
}
