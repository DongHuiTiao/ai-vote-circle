import { prisma } from './prisma';

// Worker 配置
const CONFIG = {
  // 投票任务队列配置
  voteBatchSize: 10,        // 每批处理 10 个任务
  voteProcessDelay: 3000,   // 每个 AI 建议完成后等待 3 秒

  // 发帖任务队列配置
  postBatchSize: 1,         // 发帖更慢，每次处理 1 个
  postProcessDelay: 10000,  // 10 秒

  // 通用配置
  pollInterval: 5000,       // 每 5 秒检查一次新任务
  maxRetries: 3,            // 最多重试 3 次
  heartbeatInterval: 30000, // 每 30 秒更新一次心跳
};

export class AutoVoteWorker {
  private isRunning = false;
  private stopRequested = false;
  private instanceId: string;
  private startedAt: Date | null = null;
  private totalProcessed = 0; // 已处理任务总数

  constructor() {
    // 生成实例 ID（使用 PM2 进程 ID 或进程 PID）
    this.instanceId = process.env.PM2_INSTANCE_ID || process.env.NODE_APP_INSTANCE || `worker-${process.pid}`;
  }

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
    this.startedAt = new Date();
    this.totalProcessed = 0;

    // 初始化心跳记录
    await this.initHeartbeat();

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

    // 更新心跳状态为停止
    await this.updateHeartbeat('stopped');
  }

  /**
   * 主处理循环
   */
  private async processLoop() {
    let lastHeartbeatUpdate = Date.now();

    while (this.isRunning && !this.stopRequested) {
      try {
        // 0. 定期更新心跳（每 30 秒）
        const now = Date.now();
        if (now - lastHeartbeatUpdate > CONFIG.heartbeatInterval) {
          await this.updateHeartbeat('running');
          lastHeartbeatUpdate = now;
        }

        // 1. 检查是否需要创建每日发帖任务（自检，无需外部定时器）
        await this.checkAndCreateDailyTasks();

        // 2. 优先处理发帖任务队列（因为会创建新的投票任务）
        await this.processPostJobs();

        // 3. 处理投票任务队列
        await this.processVoteJobs();

        // 4. 如果两个队列都没有任务，等待一段时间
        const pendingPostJobs = await prisma.dailyAIVoteJob.count({
          where: { status: 'pending' },
        });
        const pendingVoteJobs = await prisma.autoVoteJob.count({
          where: { status: 'pending' },
        });

        if (pendingPostJobs === 0 && pendingVoteJobs === 0) {
          await this.sleep(CONFIG.pollInterval);
        }
      } catch (error) {
        console.error('[AutoVoteWorker] 处理循环出错:', error);
        // 出错时也更新心跳状态为 error
        await this.updateHeartbeat('error');
        await this.sleep(CONFIG.pollInterval);
      }
    }

    console.log('[AutoVoteWorker] Worker 已停止');
  }

  /**
   * 处理发帖任务队列
   */
  private async processPostJobs() {
    const pendingPostJobs = await prisma.dailyAIVoteJob.count({
      where: { status: 'pending' },
    });

    if (pendingPostJobs === 0) return;

    console.log(`[DailyAIVote] 发现 ${pendingPostJobs} 个待处理发帖任务`);

    const jobs = await prisma.dailyAIVoteJob.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: CONFIG.postBatchSize,
      include: {
        user: {
          select: {
            id: true,
            accessToken: true,
            nickname: true,
          },
        },
      },
    });

    for (const job of jobs) {
      if (this.stopRequested) break;

      await this.processPostJob(job);
      await this.sleep(CONFIG.postProcessDelay);
    }
  }

  /**
   * 处理投票任务队列
   */
  private async processVoteJobs() {
    const pendingVoteJobs = await prisma.autoVoteJob.count({
      where: { status: 'pending' },
    });

    if (pendingVoteJobs === 0) return;

    console.log(`[AutoVoteWorker] 发现 ${pendingVoteJobs} 个待处理投票任务`);

    // 取出一批任务
    const jobs = await prisma.autoVoteJob.findMany({
      where: { status: 'pending' },
      orderBy: [
        { priority: 'desc' },  // 优先级高的先处理
        { createdAt: 'asc' },   // 同优先级按创建时间
      ],
      take: CONFIG.voteBatchSize,
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
        await this.sleep(CONFIG.voteProcessDelay);
      }
    }
  }

  /**
   * 处理单个发帖任务
   */
  private async processPostJob(job: any) {
    const { id, user } = job;

    try {
      console.log(`[DailyAIVote] 开始为 ${user.nickname} 创建投票`);

      // 标记为处理中
      await prisma.dailyAIVoteJob.update({
        where: { id },
        data: { status: 'processing', startedAt: new Date() },
      });

      // 调用 AI 生成投票
      const voteData = await this.generateAIVote(user);

      // 创建投票（operatorType: 'ai'）
      const vote = await prisma.vote.create({
        data: {
          title: voteData.title,
          description: voteData.description,
          type: voteData.type,
          options: voteData.options,
          operatorType: 'ai',
          createdBy: user.id,
        },
      });

      console.log(`[DailyAIVote] ${user.nickname} 创建投票成功: ${vote.title}`);

      // 标记任务完成
      await prisma.dailyAIVoteJob.update({
        where: { id },
        data: {
          status: 'completed',
          voteId: vote.id,
          completedAt: new Date(),
        },
      });

      // 增加已处理计数
      this.totalProcessed++;

    } catch (error: any) {
      console.error(`[DailyAIVote] 任务 ${id} 失败:`, error);

      const newRetryCount = job.retryCount + 1;
      const shouldRetry = newRetryCount < CONFIG.maxRetries;

      await prisma.dailyAIVoteJob.update({
        where: { id },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          error: error.message || '未知错误',
          retryCount: newRetryCount,
        },
      });

      if (shouldRetry) {
        console.log(`[DailyAIVote] 任务 ${id} 将在下次循环重试 (${newRetryCount}/${CONFIG.maxRetries})`);
      }
    }
  }

  /**
   * 处理单个投票任务
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

      // 增加已处理计数
      this.totalProcessed++;

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
   * 检查并创建每日发帖任务（Worker 自检，无需外部定时器）
   */
  private async checkAndCreateDailyTasks() {
    // 获取今天的开始时间（00:00:00）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已经创建过任务
    const existingJob = await prisma.dailyAIVoteJob.findFirst({
      where: {
        scheduledFor: today,
      },
    });

    if (existingJob) {
      // 今天的任务已存在，无需创建
      return;
    }

    console.log(`[AutoVoteWorker] 检测到今天 ${today.toDateString()} 尚未创建发帖任务，开始创建...`);

    // 获取所有已授权用户（有 accessToken 的用户）
    const users = await prisma.user.findMany({
      where: {
        accessToken: { not: null },
      },
      select: { id: true },
    });

    if (users.length === 0) {
      console.log('[AutoVoteWorker] 没有已授权用户，跳过创建发帖任务');
      return;
    }

    // 批量创建今天的发帖任务
    const result = await prisma.dailyAIVoteJob.createMany({
      data: users.map((user) => ({
        userId: user.id,
        status: 'pending',
        scheduledFor: today,
      })),
      skipDuplicates: true,
    });

    console.log(`[AutoVoteWorker] 成功创建 ${result.count} 个发帖任务`);
  }

  /**
   * 辅助函数：睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 初始化心跳记录
   */
  private async initHeartbeat() {
    const uptime = this.startedAt ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0;

    await prisma.workerHeartbeat.upsert({
      where: { instanceId: this.instanceId },
      create: {
        instanceId: this.instanceId,
        status: 'running',
        pid: process.pid,
        uptime,
        totalProcessed: this.totalProcessed,
        lastActivityAt: new Date(),
        startedAt: this.startedAt!,
      },
      update: {
        status: 'running',
        pid: process.pid,
        uptime,
        totalProcessed: this.totalProcessed,
        lastActivityAt: new Date(),
        startedAt: this.startedAt!,
      },
    });

    console.log(`[AutoVoteWorker] 心跳初始化完成，实例 ID: ${this.instanceId}`);
  }

  /**
   * 更新心跳状态
   */
  private async updateHeartbeat(status: 'running' | 'stopped' | 'error') {
    const uptime = this.startedAt ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0;

    await prisma.workerHeartbeat.upsert({
      where: { instanceId: this.instanceId },
      create: {
        instanceId: this.instanceId,
        status,
        pid: process.pid,
        uptime,
        totalProcessed: this.totalProcessed,
        lastActivityAt: new Date(),
        startedAt: this.startedAt!,
      },
      update: {
        status,
        pid: process.pid,
        uptime,
        totalProcessed: this.totalProcessed,
        lastActivityAt: new Date(),
      },
    });
  }

  /**
   * AI 生成投票内容
   */
  private async generateAIVote(user: any): Promise<any> {
    const message = `你是一个富有好奇心的 AI Agent，现在需要发起一个有趣的投票讨论。

请根据你的人格标签和价值观，生成一个投票：

要求：
1. 投票主题要有趣、有争议性、能引发讨论
2. 描述要清晰，说明为什么这个问题值得探讨
3. 提供 3-5 个选项
4. 选项要平衡，避免有明显偏向

请以 JSON 格式返回：
{
  "title": "投票标题",
  "description": "投票描述（50-200字）",
  "type": "single",
  "options": ["选项1", "选项2", "选项3", "选项4"]
}`;

    const actionControl = `仅输出合法 JSON 对象，不要解释。`;

    const response = await fetch(
      `${process.env.SECONDME_API_BASE_URL}/api/secondme/chat/stream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, actionControl }),
      }
    );

    if (!response.ok) {
      throw new Error('Chat API 调用失败');
    }

    // 解析 SSE 流
    const result = await this.parseSSE(response.body);

    // 清理可能存在的 markdown 代码块标记
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const voteData = JSON.parse(cleaned);

    // 验证数据
    if (!voteData.title || voteData.title.length < 5) {
      throw new Error('投票标题太短');
    }
    if (!voteData.options || voteData.options.length < 3) {
      throw new Error('选项数量不足');
    }

    return voteData;
  }

  /**
   * 解析 SSE 流
   */
  private async parseSSE(stream: ReadableStream | null): Promise<string> {
    if (!stream) throw new Error('No stream');

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              result += data.choices[0].delta.content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return result;
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
