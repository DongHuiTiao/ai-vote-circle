const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('检查今日发帖任务:', today.toDateString());
    console.log('====================================');

    const jobs = await prisma.dailyAIVoteJob.findMany({
      where: { scheduledFor: today },
      include: {
        user: {
          select: { id: true, nickname: true },
        },
      },
    });

    if (jobs.length === 0) {
      console.log('✅ 今天还没有任何发帖任务');
      console.log('💡 登录时会为新用户创建任务');
    } else {
      console.log('📊 今天已有 ' + jobs.length + ' 个发帖任务:\n');
      jobs.forEach((job, i) => {
        const nickname = job.user.nickname || '(未知用户)';
        console.log((i + 1) + '. ' + nickname + ' (' + job.user.id + ')');
        console.log('   状态: ' + job.status);
        console.log('   任务ID: ' + job.id);
        if (job.voteId) {
          console.log('   已创建投票: ' + job.voteId);
        }
        console.log('');
      });
      console.log('💡 再次登录不会重复创建');
    }

    process.exit(0);
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
})();
