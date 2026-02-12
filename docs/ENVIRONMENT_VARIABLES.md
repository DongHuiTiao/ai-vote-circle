# Next.js 环境变量加载优先级

## 📋 加载顺序（从高到低）

Next.js 按以下顺序查找环境变量：

1. **`.env.production`** (最高，仅在生产环境)
2. **`.env.development`** (开发环境)
3. **`.env.test`** (测试环境)
4. **`.env.local`** (本地开发，推荐)
5. **`.env`** (全局，不推荐)

---

## 🔍 Vercel 环境

在 Vercel 上，环境变量加载顺序是：

1. ⚠️ **Vercel Dashboard 设置的环境变量** (最低优先级)
2. ⚠️ **项目构建时注入的系统变量** (如 `NEXT_PUBLIC_*`)
3. 📦 `.env` 文件 (如果存在，优先级 #1)

**重要**：Vercel **不会读取 Git 仓库中的 `.env` 文件**

---

## 💻 本地开发环境

在你的电脑上运行 `pnpm dev` 时：

### 环境变量加载顺序

1. **检查 `.env.local`** (Next.js 首选)
   - 如果存在，加载其中的 `DATABASE_URL`
2. **检查 `.env.development`**
   - 如果存在，加载其中的 `DATABASE_URL`
3. **检查 `.env`**
   - 如果存在，加载其中的 `DATABASE_URL` (不推荐)

### 你的项目当前使用

根据 [`prisma.ts`](../src/lib/prisma.ts) 的代码：

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
    },
  },
});
```

**结论**：项目使用 `process.env.DATABASE_URL`，这是从 **Vercel Dashboard** 注入的环境变量。

---

## ✅ 正确的配置方式

### 本地开发连接 Neon 云数据库

1. **创建 `.env.local` 文件**：
   ```bash
   cp .env.example .env.local
   ```

2. **从 Neon 控制台复制连接字符串**，填入 `DATABASE_URL`：
   ```
   DATABASE_URL=postgres://xxx:xxx@xxx.neon.tech/neondb?sslmode=require
   ```

3. **启动开发服务器**：
   ```bash
   pnpm dev
   ```

4. **查看日志**：
   - 应该显示使用的是 Vercel 注入的数据库
   - 如果日志显示 `localhost:5432`，说明使用了 `.env` 文件

---

## 🎯 总结

| 环境 | 使用的 DATABASE_URL 来源 | 如何配置 |
|------|---------------------|--------|
| **Vercel 生产** | Vercel Dashboard → Environment Variables | 在 Vercel 设置 |
| **本地开发** | `.env.local` 或 `.env.development` | 手动在文件中配置 |

---

**你的项目目前配置正确！** ✅

如果想调试本地开发时连接 Neon 数据库，只需：
1. 在 `.env.local` 中填入 Neon 连接字符串
2. 不要使用 `.env.development` 或 `.env` 文件

这样 Next.js 会自动使用 `.env.local` 中的配置。
