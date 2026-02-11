import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/votes/seed-test - 插入测试数据
 * 用于测试投票列表显示效果
 */
export async function POST(request: NextRequest) {
  try {
    // 直接插入测试投票数据
    const testVotes = [
      {
        id: 'test-001',
        title: '测试投票 1',
        description: '单选，有描述，2天前截止',
        type: 'single',
        options: ['选项A', '选项B'],
        operatorType: 'human',
        allowChange: true,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { connect: { id: 'user-123' } },
      },
      {
        id: 'test-002',
        title: '测试投票 2',
        description: null,
        type: 'multiple',
        options: ['选项1', '选项2', '选项3'],
        operatorType: 'human',
        allowChange: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { connect: { id: 'user-123' } },
      },
    ];

    // 使用 Prisma Client 直接插入
    for (const vote of testVotes) {
      try {
        await prisma.vote.create({
          data: {
            id: vote.id,
            title: vote.title,
            description: vote.description,
            type: vote.type,
            options: vote.options,
            operatorType: vote.operatorType,
            allowChange: vote.allowChange,
            expiresAt: vote.expiresAt,
            createdBy: { connect: { id: vote.createdBy.id } },
          },
        });
        console.log(`✅ 创建投票: ${vote.id} - ${vote.title}`);
      } catch (error) {
        console.error(`❌ 创建投票失败: ${vote.id}`, error);
      }
    }

    return NextResponse.json({
      code: 0,
      data: {
        message: `成功插入 ${testVotes.length} 条测试投票数据`,
      count: testVotes.length,
      votes: testVotes.map(({ id, title, type, options, allowChange, expiresAt, operatorType, createdBy }) => ({
          id,
          title,
          description,
          type,
          options,
          allowChange,
          expiresAt,
          operatorType,
          createdAt,
          updatedAt,
          createdBy: { id: createdBy.id, nickname: createdBy.nickname || null, avatar: createdBy.avatar || null },
        })),
      },
    });
  } catch (error) {
    console.error('批量插入测试数据失败:', error);

    return NextResponse.json({
      code: -1,
      error: '插入测试数据失败',
    });
  }
}
