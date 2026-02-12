import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 在外部声明，以便在 catch 块中访问
  let user: any = null;
  let voteId: string = '';
  let vote: any = null;
  let operatorType: string = 'human';
  let choice: any = null;

  try {
    // 1. 验证用户已登录
    user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: -1, message: '请先登录' },
        { status: 401 }
      );
    }

    voteId = (await params).id;

    // 2. 验证投票存在
    vote = await prisma.vote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      return NextResponse.json(
        { code: -1, message: '投票不存在' },
        { status: 404 }
      );
    }

    // 3. 解析请求体
    const body = await request.json();
    choice = body.choice;
    const reason = body.reason;
    operatorType = body.operatorType; // 保存到外部变量

    // 验证必填字段
    if (choice === undefined || choice === null) {
      return NextResponse.json(
        { code: -1, message: 'choice 字段必填' },
        { status: 400 }
      );
    }

    if (!operatorType || !['human', 'ai'].includes(operatorType)) {
      return NextResponse.json(
        { code: -1, message: 'operatorType 必须为 human 或 ai' },
        { status: 400 }
      );
    }

    // 4. 处理投票响应
    let response;

    if (vote.allowChange) {
      // 允许改票：直接插入新记录（保留历史记录）
      response = await prisma.voteResponse.create({
        data: {
          voteId: voteId,
          userId: user.id,
          choice: choice,
          reason: reason || null,
          operatorType: operatorType,
        },
      });
    } else {
      // 不允许改票：检查是否已投过票（查询最新的记录）
      const existing = await prisma.voteResponse.findFirst({
        where: {
          voteId: voteId,
          userId: user.id,
          operatorType: operatorType,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existing) {
        return NextResponse.json(
          { code: -1, message: '你已经投过票了' },
          { status: 400 }
        );
      }

      response = await prisma.voteResponse.create({
        data: {
          voteId: voteId,
          userId: user.id,
          choice: choice,
          reason: reason || null,
          operatorType: operatorType,
        },
      });
    }

    // 6. 更新投票的 activeAt
    await prisma.vote.update({
      where: { id: voteId },
      data: { activeAt: new Date() },
    });

    // 7. 返回成功
    return NextResponse.json({
      code: 0,
      data: { responseId: response.id },
    });
  } catch (error: any) {
    apiLogger.error('提交投票失败', {
      voteId,
      userId: user?.id,
      operatorType,
      choice,
      error: error instanceof Error ? error.message : String(error),
    });

    // 开发环境返回详细错误信息
    const isDev = process.env.NODE_ENV === 'development';
    const errorMessage = isDev && error instanceof Error
      ? `提交投票失败: ${error.message}`
      : '提交投票失败，请稍后重试';

    return NextResponse.json(
      {
        code: -1,
        message: errorMessage,
        ...(isDev && { details: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    );
  }
}
