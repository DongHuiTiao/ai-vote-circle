#!/bin/bash

# ==========================================
# Vercel 部署前准备脚本
# 用途：首次部署或需要数据库迁移时使用
# ==========================================

set -e

echo "🚀 开始 Vercel 部署准备..."

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 未检测到 Vercel CLI"
    echo "请先安装: npm i -g vercel"
    exit 1
fi

# 检查是否已登录
echo "📋 检查 Vercel 登录状态..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  请先登录 Vercel: vercel login"
    exit 1
fi

# 拉取环境变量
echo "📥 拉取 Vercel 环境变量到 .env.local..."
vercel env pull .env.local

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
pnpm prisma generate

# 推送数据库结构
echo "💾 推送数据库结构到远程..."
pnpm prisma db push

echo "✅ 准备完成！现在可以运行: vercel --prod"
