import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET 检查用户是否收藏了某个投票
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    const voteId = request.nextUrl.searchParams.get('voteId');

    if (!voteId) {
      return NextResponse.json(
        { code: -1, message: '缺少 voteId 参数' },
        { status: 400 }
      );
    }

    // 检查是否已收藏
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_voteId: {
          userId: user.id,
          voteId,
        },
      },
    });

    return NextResponse.json({
      code: 0,
      data: {
        isFavorited: !!favorite,
      },
    });
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    return NextResponse.json(
      { code: -1, message: '检查收藏状态失败' },
      { status: 500 }
    );
  }
}
