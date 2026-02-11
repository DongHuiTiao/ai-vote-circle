# Worker 服务器部署指南

## 📋 概述

Auto Vote Worker 是一个独立的后台进程，用于处理 AI 自动投票任务。需要在**独立服务器**上运行，并访问 Vercel Postgres 数据库。

---

## 🚀 部署步骤

### 1. 准备服务器

**系统要求**：
- Linux/Unix 服务器（Ubuntu、Debian、CentOS 等）
- Node.js 18+
- 稳定的网络连接

**服务器资源建议**：
- CPU: 1 核心以上
- 内存: 512MB 以上
- 带宽: 1Mbps 以上

---

### 2. 安装依赖

#### 安装 Node.js（Ubuntu/Debian）

```bash
# 使用 NodeSource 仓库安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v  # 应该显示 v18.x.x
npm -v
```

#### 安装 pnpm

```bash
npm i -g pnpm
```

#### 安装 PM2（进程管理器）

```bash
npm i -g pm2
```

#### 安装 Vercel CLI

```bash
npm i -g vercel
```

---

### 3. 部署 Worker 代码

#### 方式 A：使用 Git 克隆（推荐）

```bash
# 克隆代码
cd /opt
sudo git clone <你的仓库地址> voting-community
cd voting-community

# 运行部署脚本
bash scripts/deploy-worker.sh
```

#### 方式 B：手动部署

```bash
# 1. 登录 Vercel
vercel login

# 2. 拉取环境变量
vercel env pull .env.local

# 3. 安装依赖
pnpm install

# 4. 生成 Prisma Client
pnpm prisma generate
```

---

### 4. 使用 PM2 启动 Worker

```bash
# 启动 Worker
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs auto-vote-worker

# 查看详细信息
pm2 show auto-vote-worker
```

---

### 5. 设置 PM2 开机自启

```bash
# 保存当前进程列表
pm2 save

# 生成开机启动脚本
pm2 startup

# 按照提示执行输出的命令
# 例如：sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user
```

---

## 🔧 环境变量配置

确保 `.env.local` 文件包含以下变量：

```env
# 数据库连接（Vercel CLI 会自动拉取）
DATABASE_URL=...

# SecondMe API
SECONDME_API_BASE_URL=https://app.mindos.com/gate/lab
SECONDME_OAUTH_URL=https://go.second.me/oauth

# 应用 URL（用于内部 API 调用）
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**重要**：
- 不要将 `.env.local` 提交到 Git
- 生产环境使用 `vercel env pull` 自动同步环境变量

---

## 📊 监控和维护

### 查看 Worker 状态

```bash
# 查看所有进程
pm2 list

# 实时监控
pm2 monit

# 查看日志
pm2 logs auto-vote-worker --lines 100
```

### 重启 Worker

```bash
# 重启单个进程
pm2 restart auto-vote-worker

# 重启所有进程
pm2 restart all
```

### 停止 Worker

```bash
# 停止单个进程
pm2 stop auto-vote-worker

# 停止所有进程
pm2 stop all
```

### 更新代码

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
pnpm install

# 重启 Worker
pm2 restart auto-vote-worker
```

---

## 🔒 安全建议

### 1. 使用防火墙限制入站访问

```bash
# 仅允许必要的端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP（如果需要）
sudo ufw allow 443/tcp   # HTTPS（如果需要）
sudo ufw enable
```

### 2. 定期更新系统

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 3. 监控磁盘空间

```bash
# 检查磁盘使用
df -h

# 清理旧日志
pm2 flush
```

---

## 🐛 故障排查

### Worker 无法连接数据库

**错误**: `Connection refused` 或 `timeout`

**解决**:
1. 检查 `DATABASE_URL` 是否正确
2. 确认网络连接：`ping postgres.vercel-storage.com`
3. 检查防火墙是否允许出站连接

### Worker 频繁重启

**错误**: PM2 显示 `restart count: N`

**解决**:
1. 查看错误日志：`pm2 logs auto-vote-worker --err`
2. 检查内存使用：`pm2 monit`
3. 增加内存限制或修复内存泄漏

### SecondMe API 调用失败

**错误**: `Chat API 调用失败`

**解决**:
1. 检查 `accessToken` 是否有效
2. 确认网络可以访问 SecondMe API
3. 查看 API 返回的错误信息

---

## 📈 性能优化

### 调整 Worker 配置

编辑 [src/lib/auto-vote-worker.ts](../src/lib/auto-vote-worker.ts):

```typescript
const CONFIG = {
  voteBatchSize: 10,        // 每批处理 10 个任务
  voteProcessDelay: 3000,   // 每个 AI 建议完成后等待 3 秒
  pollInterval: 5000,       // 每 5 秒检查一次新任务
  // ...
};
```

### 调整 PM2 配置

编辑 [ecosystem.config.js](../ecosystem.config.js):

```javascript
{
  max_memory_restart: '1G',  // 最大内存限制
  instances: 1,              // 实例数量
}
```

---

## 📚 相关链接

- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment/)

---

## 💡 注意事项

1. **Worker 需要持续运行**，建议使用 PM2 守护进程
2. **定期检查日志**，确保任务正常处理
3. **监控数据库连接数**，避免超出 Vercel Postgres 限制
4. **备份重要数据**，定期导出数据库

---

**祝你部署顺利！** 🎉
