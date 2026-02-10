import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/votes - 获取投票列表
 * 查询参数：
 * - page?: number (默认 1)
 * - limit?: number (默认 20)
 * - sort?: 'latest' | 'hot' (默认 'latest'，按 createdAt 倒序)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sort = searchParams.get('sort') || 'latest';

    const skip = (page - 1) * limit;

    // 根据 sort 参数决定排序方式
    const orderBy = sort === 'hot'
      ? { responses: { _count: 'desc' } as any } // 热门排序：按响应数量
      : { createdAt: 'desc' as const }; // 最新排序：按创建时间

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
            operatorType: true,
          },
        },
      },
    });

    // 统计每个投票的人类和 AI 参与数
    const votesWithStats = votes.map((vote) => {
      const humanCount = vote.responses.filter((r) => r.operatorType === 'human').length;
      const aiCount = vote.responses.filter((r) => r.operatorType === 'ai').length;

      return {
        ...vote,
        participantCount: {
          human: humanCount,
          ai: aiCount,
          total: humanCount + aiCount,
        },
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
