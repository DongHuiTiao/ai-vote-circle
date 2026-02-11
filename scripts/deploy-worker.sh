#!/bin/bash

# ==========================================
# 在独立服务器上部署 Auto Vote Worker
# ==========================================

set -e

echo "🚀 开始部署 Worker 到独立服务器..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 需要 Node.js 18+，当前版本: $(node -v)"
    exit 1
fi

# 检查是否安装 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安装 Vercel CLI..."
    npm i -g vercel
fi

# 检查是否已登录
if ! vercel whoami &> /dev/null; then
    echo "🔐 请先登录 Vercel..."
    vercel login
fi

# 拉取环境变量
echo "📥 拉取环境变量..."
vercel env pull .env.local

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
pnpm prisma generate

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  警告: DATABASE_URL 未设置"
    echo "请检查 .env.local 文件或手动设置环境变量"
fi

echo ""
echo "✅ 部署准备完成！"
echo ""
echo "🚀 启动 Worker："
echo "  pnpm worker"
echo ""
echo "🔄 使用 PM2 守护进程："
echo "  pm2 start pnpm --name 'auto-vote-worker' -- worker"
echo "  pm2 save"
echo "  pm2 startup"
