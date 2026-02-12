import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { apiLogger } from '@/lib/logger';

// GET 获取用户的收藏列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    // 获取分页参数
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // 查询收藏总数
    const total = await prisma.favorite.count({
      where: { userId: user.id },
    });

    // 查询收藏列表
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        vote: {
          include: {
            creator: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                secondmeUserId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return NextResponse.json({
      code: 0,
      data: {
        favorites: favorites.map((f) => ({
          id: f.id,
          createdAt: f.createdAt,
          vote: f.vote,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    apiLogger.error('获取收藏列表失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { code: -1, message: '获取收藏列表失败' },
      { status: 500 }
    );
  }
}
