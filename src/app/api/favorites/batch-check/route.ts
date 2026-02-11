import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET 批量检查收藏状态
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    const voteIds = request.nextUrl.searchParams.get('voteIds')?.split(',');

    if (!voteIds || voteIds.length === 0) {
      return NextResponse.json({
        code: 0,
        data: { favorites: {} },
      });
    }

    // 查询用户的收藏列表
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: user.id,
        voteId: { in: voteIds },
      },
    });

    // 构建收藏状态映射
    const favoriteMap: Record<string, boolean> = {};
    favorites.forEach((f) => {
      favoriteMap[f.voteId] = true;
    });

    // 为所有查询的投票 ID 填充状态
    const result: Record<string, boolean> = {};
    voteIds.forEach((id) => {
      result[id] = !!favoriteMap[id];
    });

    return NextResponse.json({
      code: 0,
      data: { favorites: result },
    });
  } catch (error) {
    console.error('批量检查收藏状态失败:', error);
    return NextResponse.json(
      { code: -1, message: '检查收藏状态失败' },
      { status: 500 }
    );
  }
}
