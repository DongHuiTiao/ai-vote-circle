import { prisma } from './prisma';

// Worker 配置
const CONFIG = {
  batchSize: 10,        // 每批处理 10 个任务
  processDelay: 3000,   // 每个 AI 建议完成后等待 3 秒
  pollInterval: 5000,   // 每 5 秒检查一次新任务
  maxRetries: 3,        // 最多重试 3 次
};

export class AutoVoteWorker {
  private isRunning = false;
  private stopRequested = false;

  /**
   * 启动 Worker
   */
  async start() {
    if (this.isRunning) {
      console.log('[AutoVoteWorker] Worker 已经在运行中');
      return;
    }

    console.log('[AutoVoteWorker] 启动 Worker...');
    this.isRunning = true;
    this.stopRequested = false;

    // 开始处理循环
    this.processLoop();
  }

  /**
   * 停止 Worker
   */
  async stop() {
    console.log('[AutoVoteWorker] 正在停止 Worker...');
    this.stopRequested = true;
    this.isRunning = false;
  }

  /**
   * 主处理循环
   */
  private async processLoop() {
    while (this.isRunning && !this.stopRequested) {
      try {
        // 检查是否有待处理的任务
        const pendingCount = await prisma.autoVoteJob.count({
          where: { status: 'pending' },
        });

        if (pendingCount === 0) {
          // 没有任务，等待一段时间再检查
          await this.sleep(CONFIG.pollInterval);
          continue;
        }

        console.log(`[AutoVoteWorker] 发现 ${pendingCount} 个待处理任务`);

        // 取出一批任务
        const jobs = await prisma.autoVoteJob.findMany({
          where: { status: 'pending' },
          orderBy: [
            { priority: 'desc' },  // 优先级高的先处理
            { createdAt: 'asc' },   // 同优先级按创建时间
          ],
          take: CONFIG.batchSize,
          include: {
            user: {
              select: {
                accessToken: true,
                secondmeUserId: true,
              },
            },
          },
        });

        console.log(`[AutoVoteWorker] 取出 ${jobs.length} 个任务开始处理`);

        // 逐个处理任务
        for (const job of jobs) {
          if (this.stopRequested) break;

          await this.processJob(job);

          // 处理完一个任务后等待一段时间（频率控制）
          if (!this.stopRequested) {
            await this.sleep(CONFIG.processDelay);
          }
        }
      } catch (error) {
        console.error('[AutoVoteWorker] 处理循环出错:', error);
        await this.sleep(CONFIG.pollInterval);
      }
    }

    console.log('[AutoVoteWorker] Worker 已停止');
  }

  /**
   * 处理单个任务
   */
  private async processJob(job: any) {
    const { id, voteId, user } = job;

    try {
      console.log(`[AutoVoteWorker] 开始处理任务 ${id}，投票 ${voteId}`);

      // 标记为处理中
      await prisma.autoVoteJob.update({
        where: { id },
        data: { status: 'processing', startedAt: new Date() },
      });

      // 1. 获取投票信息
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const voteRes = await fetch(`${appUrl}/api/votes/${voteId}`);
      if (!voteRes.ok) {
        throw new Error('获取投票信息失败');
      }

      const voteData = await voteRes.json();
      if (voteData.code !== 0) {
        throw new Error('投票不存在');
      }

      // 2. 检查用户是否已投过票（作为 AI）
      const existingResponse = await prisma.voteResponse.findFirst({
        where: {
          voteId,
          userId: job.userId,
          operatorType: 'ai',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingResponse) {
        console.log(`[AutoVoteWorker] 用户 ${job.userId} 已经投过票 ${voteId}，跳过`);
        await prisma.autoVoteJob.update({
          where: { id },
          data: { status: 'completed', completedAt: new Date() },
        });
        return;
      }

      // 3. 调用 AI 建议 API
      const suggestRes = await fetch(`${appUrl}/api/votes/${voteId}/ai-suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`,
          'x-user-id': user.secondmeUserId,
        },
      });

      if (!suggestRes.ok) {
        throw new Error('AI 建议 API 调用失败');
      }

      const suggestData = await suggestRes.json();
      if (suggestData.code !== 0) {
        throw new Error(suggestData.message || 'AI 建议生成失败');
      }

      const { choice, reason } = suggestData.data;

      // 4. 提交投票（直接操作数据库，不通过 API）
      await prisma.voteResponse.create({
        data: {
          voteId,
          userId: job.userId,
          choice,
          reason: reason || null,
          operatorType: 'ai',
        },
      });

      // 更新投票的 activeAt
      await prisma.vote.update({
        where: { id: voteId },
        data: { activeAt: new Date() },
      });

      // 标记任务完成
      await prisma.autoVoteJob.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date() },
      });

      console.log(`[AutoVoteWorker] 任务 ${id} 完成`);
    } catch (error: any) {
      console.error(`[AutoVoteWorker] 任务 ${id} 失败:`, error);

      // 更新失败状态
      const newRetryCount = job.retryCount + 1;
      const shouldRetry = newRetryCount < CONFIG.maxRetries;

      await prisma.autoVoteJob.update({
        where: { id },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          error: error.message || '未知错误',
          retryCount: newRetryCount,
        },
      });

      if (shouldRetry) {
        console.log(`[AutoVoteWorker] 任务 ${id} 将在下次循环重试 (${newRetryCount}/${CONFIG.maxRetries})`);
      }
    }
  }

  /**
   * 辅助函数：睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
let workerInstance: AutoVoteWorker | null = null;

export function getWorker(): AutoVoteWorker {
  if (!workerInstance) {
    workerInstance = new AutoVoteWorker();
  }
  return workerInstance;
}

// 如果直接运行此文件，启动 Worker
if (require.main === module) {
  const worker = getWorker();
  worker.start();

  // 优雅退出
  process.on('SIGINT', async () => {
    console.log('[AutoVoteWorker] 收到 SIGINT 信号，正在停止...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[AutoVoteWorker] 收到 SIGTERM 信号，正在停止...');
    await worker.stop();
    process.exit(0);
  });
}
