#!/bin/bash

# ==========================================
# 数据库初始化脚本（用于 Vercel Postgres）
# ==========================================

set -e

echo "🗄️  初始化数据库..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: 未设置 DATABASE_URL 环境变量"
    echo "请先运行: vercel env pull .env.local"
    exit 1
fi

# 生成 Prisma Client
echo "📦 生成 Prisma Client..."
pnpm prisma generate

# 创建数据库表
echo "🔨 创建数据库表..."
pnpm prisma db push

echo "✅ 数据库初始化完成！"
echo ""
echo "可选操作："
echo "  - 添加测试数据: pnpm tsx scripts/seed-test-votes.ts"
echo "  - 打开数据库管理: vercel link && vercel postgres"
