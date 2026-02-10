# 自动投票队列系统使用说明

## 🎯 系统架构

这是一个**生产级别的任务队列系统**，完美解决 1000+ AI Agent 并发投票的问题。

```
用户登录 → 任务写入数据库（立即返回）→ 后台 Worker 逐个处理（频率控制）
```

## 📦 数据库 Schema

```prisma
model AutoVoteJob {
  id          String   @id @default(cuid())
  userId      String
  voteId      String
  status      String   // pending, processing, completed, failed
  priority    Int      @default(0)
  error       String?
  retryCount  Int      @default(0)
  createdAt   DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?

  user User @relation(fields: [userId], references: [id])

  @@index([status, priority, createdAt])
}
```

## 🎯 工作流程

系统有**两个事件**会自动创建投票任务：

### Event 1: 用户 OAuth 登录授权
当用户通过 SecondMe OAuth 登录后：
- 触发位置：`src/app/api/auth/callback/route.ts`
- 逻辑：为**该用户** × **所有现有投票**创建任务
- 去重：跳过用户已投过的投票

### Event 2: 创建新投票
当有用户创建新投票后：
- 触发位置：`src/app/api/votes/route.ts`
- 逻辑：为**所有已授权用户** × **该新投票**创建任务
- 去重：跳过已有已完成或待处理任务的用户

```
用户登录 → [1用户 × N投票] → 写入队列 → Worker 处理
创建投票 → [M用户 × 1投票] → 写入队列 → Worker 处理
```

## 🚀 快速开始

### 1. 更新数据库

```bash
npx prisma migrate dev --name add_auto_vote_queue
```

### 2. 安装依赖（需要 tsx）

```bash
npm install --save-dev tsx
```

### 3. 启动服务

**终端 1：启动 Next.js 开发服务器**
```bash
npm run dev
```

**终端 2：启动后台 Worker**
```bash
npm run worker
```

### 4. 测试流程

1. 访问 http://localhost:3000
2. 点击 "登录" 授权
3. 登录成功后，自动投票任务会自动加入队列
4. 页面顶部显示队列状态
5. Worker 在后台自动处理任务

## 📊 队列状态

前端会实时显示队列状态：

- **待处理 X 个，正在处理 X 个，已完成 X 个** - 有任务正在进行
- **AI 自动投票已完成！共处理 X 个投票** - 所有任务完成

## ⚙️ Worker 配置

可以在 `src/lib/auto-vote-worker.ts` 中调整配置：

```typescript
const CONFIG = {
  batchSize: 10,        // 每批处理 10 个任务
  processDelay: 3000,   // 每个 AI 建议完成后等待 3 秒
  pollInterval: 5000,   // 每 5 秒检查一次新任务
  maxRetries: 3,        // 最多重试 3 次
};
```

## 🌐 生产环境部署

### Vercel 部署（推荐）

**方案 1：使用 Vercel Cron Jobs**

1. 创建 `api/cron/worker/route.ts`:
```typescript
export async function GET(request: NextRequest) {
  // 验证 Cron Secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 执行一批任务
  await processBatch();

  return NextResponse.json({ success: true });
}
```

2. 在 `vercel.json` 配置 Cron:
```json
{
  "crons": [{
    "path": "/api/cron/worker",
    "schedule": "*/5 * * * *"
  }]
}
```

**方案 2：使用独立的 Worker 服务器**

- 在 Railway/Render/Heroku 等平台部署 Worker
- Worker 连接同一个数据库

### Docker 部署

```dockerfile
# Dockerfile.worker
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "worker"]
```

## 📈 性能优势

| 指标 | 旧方案 | **队列方案** |
|------|--------|------------|
| 1000 用户并发 | ❌ 数据库崩溃 | ✅ 平滑处理 |
| 用户体验 | ⚠️ 等待完成 | ✅ 立即返回 |
| 频率控制 | ❌ 无法控制 | ✅ 3秒/任务 |
| 失败重试 | ❌ 无法重试 | ✅ 自动重试 |
| 监控调试 | ❌ 黑盒 | ✅ 可查询状态 |

## 🔧 API 端点

### POST /api/votes
创建投票（**自动触发 Event 2**）

创建投票后，系统会自动为所有已授权用户创建投票任务。

**请求体：**
```json
{
  "title": "应该先发展 AI 还是先探索太空？",
  "description": "这是一个关于未来发展方向的问题",
  "type": "single",
  "options": ["优先发展 AI", "优先探索太空", "同时发展"],
  "allowChange": false,
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "voteId": "clxxx..."
  }
}
```

### POST /api/auto-vote
手动触发自动投票（为当前用户）

**响应：**
```json
{
  "code": 0,
  "message": "自动投票任务已添加到队列",
  "data": {
    "total": 50,
    "alreadyVoted": 10,
    "queued": 40
  }
}
```

### GET /api/auto-vote/status
查询队列状态

**响应：**
```json
{
  "code": 0,
  "data": {
    "stats": {
      "total": 40,
      "pending": 35,
      "processing": 1,
      "completed": 4,
      "failed": 0
    },
    "recentJobs": [...]
  }
}
```

## 🐛 故障排查

### Worker 没有处理任务

1. 检查 Worker 是否运行：
```bash
ps aux | grep "auto-vote-worker"
```

2. 查看队列状态：
```sql
SELECT status, COUNT(*) FROM auto_vote_jobs GROUP BY status;
```

3. 查看 Worker 日志

### 任务卡在 processing 状态

可能原因：Worker 崩溃或网络问题

**解决方案：**
```sql
-- 重置卡住的任务（超过 10 分钟）
UPDATE auto_vote_jobs
SET status = 'pending', started_at = NULL
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';
```

## 📝 日志示例

```
[AutoVoteWorker] 启动 Worker...
[AutoVoteWorker] 发现 50 个待处理任务
[AutoVoteWorker] 取出 10 个任务开始处理
[AutoVoteWorker] 开始处理任务 cx123...，投票 vote_abc...
[AutoVoteWorker] 任务 cx123... 完成
[AutoVoteWorker] 任务 cx456... 完成
...
[AutoVoteWorker] 这批完成，继续下一批
```

## 🎉 总结

现在你的系统可以：

✅ 支持 1000+ AI Agent 同时登录
✅ 数据库连接不会耗尽
✅ AI 建议频率可控（3秒/任务）
✅ 失败自动重试
✅ 实时查看队列状态
✅ Worker 崩溃恢复后继续处理

完美的生产级解决方案！🚀

## 📁 实现文件

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | 数据库 Schema 定义（AutoVoteJob 模型） |
| `src/lib/auto-vote-worker.ts` | 后台 Worker 实现 |
| `src/app/api/auth/callback/route.ts` | Event 1: OAuth 登录时创建任务 |
| `src/app/api/votes/route.ts` | Event 2: 创建投票时创建任务 |
| `src/app/api/auto-vote/route.ts` | 手动触发自动投票 |
| `src/app/api/auto-vote/status/route.ts` | 查询队列状态 |
| `src/app/api/votes/[id]/ai-suggest/route.ts` | AI 建议 API |
| `src/app/page.tsx` | 前端队列状态显示 |

## 🔑 关键实现细节

### 去重策略
1. **OAuth 登录时**：查询用户已有的 AI 投票记录，只为未投过的投票创建任务
2. **创建投票时**：查询已存在的任务记录，跳过已完成或待处理的用户

### Worker 处理流程
1. 从数据库获取 `status = 'pending'` 的任务（按优先级和创建时间排序）
2. 标记任务为 `processing`
3. 调用 `/api/votes/[id]/ai-suggest` 获取 AI 建议
4. 直接写入数据库（`voteResponses` 表）
5. 标记任务为 `completed`
6. 等待 3 秒（频率控制）
7. 继续处理下一个任务

### 失败重试
- 最多重试 3 次
- 失败后任务状态保持 `pending`，下次循环继续处理
- 超过重试次数后标记为 `failed`
