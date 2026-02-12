import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/logger';

/**
 * POST /api/auto-vote
 * 将自动投票任务添加到队列（立即返回）
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    // 获取所有投票
    const allVotes = await prisma.vote.findMany({
      select: {
        id: true,
        title: true,
      },
    });

    // 获取用户已投的 AI 投票
    const userAIVotes = await prisma.voteResponse.findMany({
      where: {
        userId: user.id,
        operatorType: 'ai',
      },
      select: {
        voteId: true,
      },
    });

    const votedVoteIds = new Set(userAIVotes.map((v) => v.voteId));

    // 过滤出还没投过的投票
    const votesToProcess = allVotes.filter((vote) => !votedVoteIds.has(vote.id));

    if (votesToProcess.length === 0) {
      return NextResponse.json({
        code: 0,
        message: '所有投票已完成',
        data: {
          total: allVotes.length,
          alreadyVoted: votedVoteIds.size,
          queued: 0,
        },
      });
    }

    // 批量创建任务到队列
    const jobs = await prisma.autoVoteJob.createMany({
      data: votesToProcess.map((vote) => ({
        userId: user.id,
        voteId: vote.id,
        status: 'pending',
        priority: 0,
      })),
      skipDuplicates: true,
    });

    apiLogger.info('自动投票任务已添加到队列', {
      userId: user.id,
      totalVotes: allVotes.length,
      alreadyVoted: votedVoteIds.size,
      queued: jobs.count,
    });

    return NextResponse.json({
      code: 0,
      message: '自动投票任务已添加到队列',
      data: {
        total: allVotes.length,
        alreadyVoted: votedVoteIds.size,
        queued: jobs.count,
      },
    });
  } catch (error) {
    apiLogger.error('添加自动投票任务失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { code: -1, message: '添加自动投票任务失败' },
      { status: 500 }
    );
  }
}
