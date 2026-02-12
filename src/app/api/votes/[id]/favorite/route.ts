import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { apiLogger } from '@/lib/logger';

// POST 收藏投票
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voteId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    // 检查投票是否存在
    const vote = await prisma.vote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      return NextResponse.json(
        { code: -1, message: '投票不存在' },
        { status: 404 }
      );
    }

    // 检查是否已收藏
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_voteId: {
          userId: user.id,
          voteId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { code: -1, message: '已经收藏过了' },
        { status: 400 }
      );
    }

    // 创建收藏
    await prisma.favorite.create({
      data: {
        userId: user.id,
        voteId,
      },
    });

    return NextResponse.json({
      code: 0,
      message: '收藏成功',
    });
  } catch (error) {
    apiLogger.error('收藏失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { code: -1, message: '收藏失败' },
      { status: 500 }
    );
  }
}

// DELETE 取消收藏
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voteId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    // 查找收藏记录
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_voteId: {
          userId: user.id,
          voteId,
        },
      },
    });

    if (!favorite) {
      return NextResponse.json(
        { code: -1, message: '未收藏该投票' },
        { status: 404 }
      );
    }

    // 删除收藏
    await prisma.favorite.delete({
      where: {
        userId_voteId: {
          userId: user.id,
          voteId,
        },
      },
    });

    return NextResponse.json({
      code: 0,
      message: '取消收藏成功',
    });
  } catch (error) {
    apiLogger.error('取消收藏失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { code: -1, message: '取消收藏失败' },
      { status: 500 }
    );
  }
}
