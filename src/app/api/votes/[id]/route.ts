import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 查询投票基本信息
    const vote = await prisma.vote.findUnique({
      where: { id },
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
    });

    if (!vote) {
      return NextResponse.json(
        { code: -1, message: '投票不存在' },
        { status: 404 }
      );
    }

    // 2. 查询所有投票响应
    const responses = await prisma.voteResponse.findMany({
      where: { voteId: id },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            secondmeUserId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. 统计各选项票数
    // 获取每个用户的最新投票（按 operatorType 分别统计）
    const latestResponsesMap = new Map<string, typeof responses[0]>();

    responses.forEach((response) => {
      // key 格式: voteId-userId-operatorType
      const key = `${response.voteId}-${response.userId}-${response.operatorType}`;
      const existing = latestResponsesMap.get(key);

      // 如果没有记录或者当前记录更新，则保存当前记录
      if (!existing || response.createdAt > existing.createdAt) {
        latestResponsesMap.set(key, response);
      }
    });

    const latestResponses = Array.from(latestResponsesMap.values());

    // 统计各选项
    const stats: Record<
      string,
      {
        human: number;
        ai: number;
        total: number;
        percentage: number;
      }
    > = {};

    latestResponses.forEach((response) => {
      // 处理 choice 字段
      // choice 可能是单个数字（单选）或数字数组（多选）
      const choice = response.choice;
      const operatorType = response.operatorType; // 'human' | 'ai'

      if (typeof choice === 'number') {
        // 单选
        const optionKey = String(choice);

        if (!stats[optionKey]) {
          stats[optionKey] = {
            human: 0,
            ai: 0,
            total: 0,
            percentage: 0,
          };
        }

        if (operatorType === 'human') {
          stats[optionKey].human++;
        } else if (operatorType === 'ai') {
          stats[optionKey].ai++;
        }
        stats[optionKey].total++;
      } else if (Array.isArray(choice)) {
        // 多选
        choice.forEach((choiceIndex) => {
          const optionKey = String(choiceIndex);

          if (!stats[optionKey]) {
            stats[optionKey] = {
              human: 0,
              ai: 0,
              total: 0,
              percentage: 0,
            };
          }

          if (operatorType === 'human') {
            stats[optionKey].human++;
          } else if (operatorType === 'ai') {
            stats[optionKey].ai++;
          }
          stats[optionKey].total++;
        });
      }
    });

    // 计算总数和百分比
    const totalVotes = latestResponses.length;
    Object.keys(stats).forEach((key) => {
      stats[key].percentage =
        totalVotes > 0 ? (stats[key].total / totalVotes) * 100 : 0;
    });

    // 4. 返回数据
    return NextResponse.json({
      code: 0,
      data: {
        vote,
        stats,
        responses,
        totalVotes,
      },
    });
  } catch (error) {
    console.error('获取投票详情失败:', error);
    return NextResponse.json(
      { code: -1, message: '获取投票详情失败' },
      { status: 500 }
    );
  }
}
