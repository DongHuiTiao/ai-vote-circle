import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 🔧 环境变量加载（按优先级）
// Next.js 自动加载：.env.production > .env.local > .env > Vercel 注入的 DATABASE_URL
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 确保 production 环境也正确初始化 prisma
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
