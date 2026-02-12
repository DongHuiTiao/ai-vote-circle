import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/auto-vote/status
 * 查询当前用户的自动投票队列状态
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    // 查询用户的任务统计
    const [pendingCount, processingCount, completedCount, failedCount] = await Promise.all([
      prisma.autoVoteJob.count({
        where: { userId: user.id, status: 'pending' },
      }),
      prisma.autoVoteJob.count({
        where: { userId: user.id, status: 'processing' },
      }),
      prisma.autoVoteJob.count({
        where: { userId: user.id, status: 'completed' },
      }),
      prisma.autoVoteJob.count({
        where: { userId: user.id, status: 'failed' },
      }),
    ]);

    // 获取最近的任务
    const recentJobs = await prisma.autoVoteJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });

    const total = pendingCount + processingCount + completedCount + failedCount;

    return NextResponse.json({
      code: 0,
      data: {
        stats: {
          total,
          pending: pendingCount,
          processing: processingCount,
          completed: completedCount,
          failed: failedCount,
        },
        recentJobs,
      },
    });
  } catch (error) {
    apiLogger.error('获取队列状态失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { code: -1, message: '获取队列状态失败' },
      { status: 500 }
    );
  }
}
