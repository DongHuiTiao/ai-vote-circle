import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/votes - 获取投票列表
 * 查询参数：
 * - page?: number (默认 1)
 * - limit?: number (默认 20)
 * - sort?: 'newest' | 'hot' | 'active' (默认 'newest'，按 createdAt 倒序)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sort = searchParams.get('sort') || 'newest';

    const skip = (page - 1) * limit;

    // 根据 sort 参数决定排序方式
    let orderBy: any;
    switch (sort) {
      case 'hot':
        // 最热门：按响应数量（需要在前端统计后排序）
        orderBy = { createdAt: 'desc' };
        break;
      case 'active':
        // 最近活跃：按 activeAt 倒序
        orderBy = { activeAt: 'desc' };
        break;
      case 'newest':
      default:
        // 最新：按 createdAt 倒序
        orderBy = { createdAt: 'desc' };
        break;
    }

    // 查询投票列表
    const votes = await prisma.vote.findMany({
      skip,
      take: limit,
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        responses: {
          select: {
            id: true,
            userId: true,
            operatorType: true,
            createdAt: true,
          },
        },
      },
    });

    // 获取用户的所有投票记录（用于检查是否已投票）
    let userVoteRecords: Array<{ voteId: string; operatorType: string; createdAt: Date }> = [];
    if (user) {
      userVoteRecords = await prisma.voteResponse.findMany({
        where: { userId: user.id },
        select: {
          voteId: true,
          operatorType: true,
          createdAt: true,
        },
      });
    }

    // 统计每个投票的人类和 AI 参与数，并检查用户是否已投票
    const votesWithStats = votes.map((vote) => {
      // 按 operatorType 统计，每个用户每种类型取最新的一条
      const latestByUser = new Map<string, { createdAt: Date; operatorType: string }>();
      vote.responses.forEach((r) => {
        const key = `${r.userId}-${r.operatorType}`;
        const existing = latestByUser.get(key);
        if (!existing || r.createdAt > existing.createdAt) {
          latestByUser.set(key, { createdAt: r.createdAt, operatorType: r.operatorType });
        }
      });

      const uniqueResponses = Array.from(latestByUser.values());
      const humanCount = uniqueResponses.filter((r) => r.operatorType === 'human').length;
      const aiCount = uniqueResponses.filter((r) => r.operatorType === 'ai').length;

      // 检查当前用户是否已投票
      let userVoted = false;
      let userHasVotedAsHuman = false;
      let userHasVotedAsAI = false;

      if (user) {
        const userVotesForThisVote = userVoteRecords.filter((r) => r.voteId === vote.id);
        userHasVotedAsHuman = userVotesForThisVote.some((r) => r.operatorType === 'human');
        userHasVotedAsAI = userVotesForThisVote.some((r) => r.operatorType === 'ai');

        // 用户已投过票（人类或 AI）就标记为已投票
        userVoted = userHasVotedAsHuman || userHasVotedAsAI;
      }

      return {
        ...vote,
        participantCount: {
          human: humanCount,
          ai: aiCount,
          total: humanCount + aiCount,
        },
        userVoted,
        userHasVotedAsHuman,
        userHasVotedAsAI,
      };
    });

    const total = await prisma.vote.count();

    return NextResponse.json({
      code: 0,
      data: {
        votes: votesWithStats,
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      {
        code: -1,
        error: '获取投票列表失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/votes - 创建投票
 * 请求体：
 * - title: string (必填)
 * - description?: string (可选)
 * - type: 'single' | 'multiple' (必填)
 * - options: string[] (至少2个)
 * - allowChange?: boolean (默认 false)
 * - expiresAt?: Date (可选)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // 验证用户已登录
    if (!user) {
      return NextResponse.json(
        {
          code: -1,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, type, options, allowChange, expiresAt } = body;

    // 验证必填字段
    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          code: -1,
          error: '投票标题不能为空',
        },
        { status: 400 }
      );
    }

    if (!type || !['single', 'multiple'].includes(type)) {
      return NextResponse.json(
        {
          code: -1,
          error: '投票类型必须是 single 或 multiple',
        },
        { status: 400 }
      );
    }

    // 验证选项
    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        {
          code: -1,
          error: '至少需要2个投票选项',
        },
        { status: 400 }
      );
    }

    // 验证选项内容
    const validOptions = options.filter((opt) => opt && opt.trim());
    if (validOptions.length < 2) {
      return NextResponse.json(
        {
          code: -1,
          error: '至少需要2个有效的投票选项',
        },
        { status: 400 }
      );
    }

    // 创建投票
    const vote = await prisma.vote.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type,
        options: validOptions,
        operatorType: 'human', // 由人类用户创建
        allowChange: allowChange ?? false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user.id,
      },
    });

    // Event 2: 创建投票后，为所有已授权用户添加自动投票任务
    try {
      // 获取所有已授权用户（有 accessToken 的用户）
      const authorizedUsers = await prisma.user.findMany({
        where: {
          accessToken: { not: null },
        },
        select: { id: true },
      });

      if (authorizedUsers.length > 0) {
        // 获取已存在的任务（用于去重）
        const existingJobs = await prisma.autoVoteJob.findMany({
          where: {
            voteId: vote.id,
            userId: { in: authorizedUsers.map((u) => u.id) },
          },
          select: { userId: true, status: true },
        });

        // 已完成的任务对应的用户 ID
        const completedUserIds = new Set(
          existingJobs.filter((j) => j.status === 'completed').map((j) => j.userId)
        );

        // 待处理或处理中的任务对应的用户 ID
        const pendingUserIds = new Set(
          existingJobs.filter((j) => j.status === 'pending' || j.status === 'processing').map((j) => j.userId)
        );

        // 需要创建任务的用户：已授权用户中，没有已完成任务且没有待处理任务的
        const usersToCreateJobs = authorizedUsers.filter(
          (u) => !completedUserIds.has(u.id) && !pendingUserIds.has(u.id)
        );

        if (usersToCreateJobs.length > 0) {
          await prisma.autoVoteJob.createMany({
            data: usersToCreateJobs.map((u) => ({
              userId: u.id,
              voteId: vote.id,
              status: 'pending',
              priority: 0,
            })),
            skipDuplicates: true,
          });

          console.log(`[CreateVote] 为 ${usersToCreateJobs.length} 个用户创建自动投票任务`);
        }
      }
    } catch (error) {
      console.error('[CreateVote] 创建自动投票任务失败:', error);
      // 不影响投票创建流程，继续返回成功
    }

    return NextResponse.json({
      code: 0,
      data: {
        voteId: vote.id,
      },
    });
  } catch (error) {
    console.error('Error creating vote:', error);
    return NextResponse.json(
      {
        code: -1,
        error: '创建投票失败',
      },
      { status: 500 }
    );
  }
}
