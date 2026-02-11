# Vercel 部署指南

## 📋 部署前检查清单

- [ ] GitHub 仓库已创建并推送到远程
- [ ] SecondMe 应用已创建，获取到 Client ID 和 Secret
- [ ] Vercel 账号已注册
- [ ] Node.js 版本 >= 18

---

## 🚀 部署步骤

### 1. 在 Vercel 创建项目

1. 访问 [vercel.com](https://vercel.com)
2. 点击 **"Add New"** → **"Project"**
3. 导入你的 GitHub 仓库
4. 配置项目：
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `pnpm build` (自动检测)
   - Output Directory: `.next` (自动检测)

---

### 2. 配置数据库

#### ⚠️ 重要提示（2025年1月更新）

**Vercel Postgres 已停止服务**，需要通过 Marketplace 集成外部 Postgres。

#### 方案 A：Neon（推荐，Vercel 官方合作伙伴）

1. 在 Vercel 项目页面点击 **"Storage"** → **"Create Database"**
2. 选择 **"Neon"** (或搜索 "Neon" 集成)
3. 选择区域（推荐选择离用户最近的区域）
4. 点击 **"Create"** 或 **"Install"**

**优点**：
- ✅ 无需单独 Neon 账户
- ✅ 在 Vercel 统一管理
- ✅ 自动配置连接
- ✅ 免费额度：0.5GB 存储、191.9小时/月计算时间

Vercel 会自动将以下环境变量注入到你的项目中：
- `DATABASE_URL`
- `POSTGRES_URL` (用于直接连接)
- `POSTGRES_PRISMA_URL` (Prisma 专用)
- `POSTGRES_URL_NON_POOLING` (无连接池版本)

#### 方案 B：其他 Postgres 提供商

你也可以选择其他 Postgres 提供商（通过 Marketplace 集成或手动配置）：
- **Supabase** - 有免费层，功能丰富
- **Railway** - 简单易用
- **ElephantSQL** - 纯 Postgres 服务

步骤：
1. 在对应的平台上创建数据库实例
2. 获取连接字符串（Connection String）
3. 在 Vercel 项目设置中手动添加环境变量（见下一步）

---

### 3. 配置环境变量

进入 Vercel 项目 → **Settings** → **Environment Variables**，添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `SECONDME_CLIENT_ID` | SecondMe 应用 ID | 从 SecondMe 控制台获取 |
| `SECONDME_CLIENT_SECRET` | SecondMe 应用密钥 | 从 SecondMe 控制台获取 |
| `SECONDME_REDIRECT_URI` | OAuth 回调地址 | `https://your-app.vercel.app/api/auth/callback` |
| `SECONDME_API_BASE_URL` | SecondMe API 地址 | `https://app.mindos.com/gate/lab` |
| `SECONDME_OAUTH_URL` | SecondMe OAuth 地址 | `https://go.second.me/oauth` |

**重要**：选择适用的环境（Production / Preview / Development）

---

### 4. 首次数据库初始化

安装 Vercel CLI 并运行数据库迁移：

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 链接项目
cd your-project
vercel link

# 4. 拉取环境变量到本地
vercel env pull .env.local

# 5. 初始化数据库
pnpm prisma generate
pnpm prisma db push
```

或者直接运行准备好的脚本：

```bash
bash scripts/vercel-deploy.sh
```

---

### 5. 更新 SecondMe 回调地址

在 SecondMe 控制台更新 OAuth 回调地址：

```
https://your-project-name.vercel.app/api/auth/callback
```

---

### 6. 触发部署

完成上述配置后，有两种部署方式：

#### 自动部署
推送代码到 GitHub 主分支，Vercel 会自动部署：

```bash
git add .
git commit -m "chore: prepare for vercel deployment"
git push origin main
```

#### 手动部署
```bash
vercel --prod
```

---

## 🔄 后续部署

后续只需推送代码即可自动部署，无需重复上述步骤。

**数据库结构变更时**：
```bash
# 修改 prisma/schema.prisma 后
vercel env pull .env.local
pnpm prisma db push
git add prisma/schema.prisma
git commit -m "feat: update database schema"
git push
```

---

## 🔍 环境变量说明

### 本地开发
从 `.env.example` 复制配置：
```bash
cp .env.example .env.local
# 填入你的实际配置
```

### Vercel 环境
环境变量在 Vercel 控制台配置，不会提交到 Git。

---

## 📊 Cron Jobs（已移除）

**注意**：项目的每日 AI 投票任务（`/api/cron/daily-ai-vote`）已被移除。

如果未来需要定时任务功能，有两种方式：

1. **升级到 Vercel Pro 计划**（$20/月）
   - 支持内置 Cron Jobs
   - 在 [vercel.json](../vercel.json) 中配置

2. **使用外部定时任务服务**（免费替代方案）
   - GitHub Actions
   - cron-job.org
   - 你的独立服务器上的 PM2

当前项目使用独立 Worker 进程处理后台任务，详见 [Worker 部署指南](WORKER_DEPLOYMENT.md)。

---

---

## 🐛 常见问题

### 1. 部署失败：数据库连接错误
**原因**：`DATABASE_URL` 未正确配置
**解决**：
- 检查是否已通过 Marketplace 集成 Neon 或其他 Postgres
- 确认环境变量已正确设置
- 使用 `vercel env pull .env.local` 同步环境变量到本地

### 2. Prisma Client 生成失败
**原因**：`postinstall` 脚本未正确执行
**解决**：确保 `package.json` 中包含 `"postinstall": "prisma generate"`

### 3. OAuth 回调失败
**原因**：`SECONDME_REDIRECT_URI` 与实际部署域名不匹配
**解决**：更新 Vercel 环境变量和 SecondMe 控制台配置

---

## 📚 相关链接

### 官方文档
- [Vercel 文档](https://vercel.com/docs)
- [Postgres on Vercel (Marketplace 集成)](https://vercel.com/docs/postgres)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment/vercel)
- [SecondMe 开发文档](https://develop-docs.second.me/zh/docs)

### 数据库提供商
- [Neon](https://neon.tech/) - Vercel 官方合作伙伴
- [Supabase](https://supabase.com/) - 开源 Firebase 替代品
- [Railway](https://railway.app/) - 简单的云平台

---

## ✅ 部署后检查

部署完成后，测试以下功能：

- [ ] 首页能正常访问
- [ ] SecondMe 登录功能正常
- [ ] 可以创建投票
- [ ] 可以参与投票
- [ ] AI 投票功能正常
- [ ] 数据正常保存到数据库

---

**祝你部署顺利！** 🎉
