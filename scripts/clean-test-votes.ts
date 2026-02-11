import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 清理测试投票数据
 * 删除标题以 "测试投票" 开头的投票
 * 相关的 VoteResponse 和 Favorite 会通过级联删除自动清理
 */
async function cleanTestVotes() {
  console.log('🧹 开始清理测试投票数据...\n');

  // 1. 先查询会删除哪些数据
  const testVotes = await prisma.vote.findMany({
    where: {
      title: {
        startsWith: '测试投票',
      },
    },
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          responses: true,
          favorites: true,
        },
      },
    },
  });

  if (testVotes.length === 0) {
    console.log('✅ 没有找到测试数据，无需清理');
    process.exit(0);
  }

  console.log(`📊 找到 ${testVotes.length} 条测试投票:`);
  console.log('─'.repeat(60));

  let totalResponses = 0;
  let totalFavorites = 0;

  testVotes.forEach((vote) => {
    console.log(`  📝 ${vote.title} (${vote.id})`);
    console.log(`     └─ 响应: ${vote._count.responses} 条, 收藏: ${vote._count.favorites} 条`);
    totalResponses += vote._count.responses;
    totalFavorites += vote._count.favorites;
  });

  console.log('─'.repeat(60));
  console.log(`📈 总计影响:`);
  console.log(`   - 投票: ${testVotes.length} 条`);
  console.log(`   - 投票响应: ${totalResponses} 条`);
  console.log(`   - 收藏记录: ${totalFavorites} 条`);
  console.log('');

  // 2. 执行删除
  console.log('⚠️  准备删除这些数据...');
  console.log('');

  const deleteResult = await prisma.vote.deleteMany({
    where: {
      title: {
        startsWith: '测试投票',
      },
    },
  });

  console.log('─'.repeat(60));
  console.log('✅ 清理完成！');
  console.log(`📊 已删除: ${deleteResult.count} 条测试投票`);
  console.log(`   (相关的 ${totalResponses} 条响应和 ${totalFavorites} 条收藏记录已自动清理)`);
}

cleanTestVotes()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
