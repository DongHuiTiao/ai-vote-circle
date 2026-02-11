import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed100TestVotes() {
  console.log('🌱 开始生成100条测试投票数据...');

  // 1. 获取真实用户
  const users = await prisma.user.findMany({
    select: { id: true },
    take: 10, // 最多取10个用户
  });

  if (users.length === 0) {
    console.error('❌ 数据库中没有用户，请先创建用户');
    process.exit(1);
  }

  console.log(`✅ 找到 ${users.length} 个真实用户`);

  // 2. 生成100条测试数据
  const voteTypes: ('single' | 'multiple')[] = ['single', 'single', 'multiple']; // 单选多选 2:1 比例
  const optionSets = [
    ['选项A', '选项B'],
    ['选项1', '选项2', '选项3'],
    ['测试一', '测试二', '测试三', '测试四'],
  ];

  let successCount = 0;
  let skipCount = 0;

  for (let i = 1; i <= 100; i++) {
    const userId = users[Math.floor(Math.random() * users.length)].id;
    const type = voteTypes[Math.floor(Math.random() * voteTypes.length)];
    const options = optionSets[Math.floor(Math.random() * optionSets.length)];
    const hasDescription = Math.random() > 0.3; // 70% 有描述

    // 随机过期时间：null, 7天内, 30天内
    const expiresAt = Math.random() > 0.5
      ? null
      : Math.random() > 0.5
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      await prisma.vote.create({
        data: {
          id: `test-${String(i).padStart(3, '0')}`,
          title: `测试投票 ${i}`,
          description: hasDescription ? '这是一个测试投票描述，用于展示UI样式效果' : null,
          type,
          options,
          operatorType: 'human',
          allowChange: Math.random() > 0.5,
          expiresAt,
          createdBy: userId,
        },
      });
      successCount++;
      console.log(`✅ [${successCount}/100] 创建测试投票 ${i}`);
    } catch (error: any) {
      if (error?.code === 'P2002') { // 唯一约束冲突
        skipCount++;
        console.log(`⏭️  跳过已存在的投票: test-${String(i).padStart(3, '0')}`);
      } else {
        console.error(`❌ 创建投票 ${i} 失败:`, error.message);
      }
    }
  }

  console.log('\n✨ 完成！');
  console.log(`📊 成功创建: ${successCount} 条`);
  console.log(`⏭️  跳过重复: ${skipCount} 条`);
  console.log(`📝 总计处理: ${successCount + skipCount} 条`);
}

seed100TestVotes()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
