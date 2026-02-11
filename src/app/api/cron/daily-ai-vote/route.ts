import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/daily-ai-vote
 * 定时任务：每天为所有已授权用户创建 AI 发帖任务
 *
 * Cron 表达式：0 1 * * *（每天凌晨 1 点）
 */
export async function GET(request: NextRequest) {
  // 验证 Cron Secret（生产环境必须配置）
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    console.error('[DailyAIVote] CRON_SECRET 未配置');
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 获取今天的开始时间（00:00:00）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`[DailyAIVote] 开始检查 ${today.toDateString()} 的发帖任务`);

    // 检查今天是否已经创建过任务
    const existingJob = await prisma.dailyAIVoteJob.findFirst({
      where: {
        scheduledFor: today,
      },
    });

    if (existingJob) {
      console.log(`[DailyAIVote] 今天的发帖任务已存在，跳过创建`);
      return NextResponse.json({
        code: 0,
        message: '今天的发帖任务已存在',
      });
    }

    // 获取所有已授权用户（有 accessToken 的用户）
    const users = await prisma.user.findMany({
      where: {
        accessToken: { not: null },
      },
      select: { id: true },
    });

    if (users.length === 0) {
      console.log(`[DailyAIVote] 没有已授权用户`);
      return NextResponse.json({
        code: 0,
        data: { count: 0 },
        message: '没有已授权用户',
      });
    }

    // 批量创建今天的发帖任务
    const result = await prisma.dailyAIVoteJob.createMany({
      data: users.map((user) => ({
        userId: user.id,
        status: 'pending',
        scheduledFor: today,
      })),
      skipDuplicates: true,
    });

    console.log(`[DailyAIVote] 创建了 ${result.count} 个发帖任务`);

    return NextResponse.json({
      code: 0,
      data: {
        count: result.count,
        date: today.toISOString(),
      },
      message: `成功创建 ${result.count} 个发帖任务`,
    });
  } catch (error) {
    console.error('[DailyAIVote] Error:', error);
    return NextResponse.json(
      { code: -1, error: '创建发帖任务失败' },
      { status: 500 }
    );
  }
}
