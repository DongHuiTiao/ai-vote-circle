# 数据库连接问题排查指南

## 问题：部署后仍连接本地数据库

部署到 Vercel 后，应用仍然连接到 `localhost:5432` 而不是云端数据库。

---

## ✅ 已修复的代码问题

### 1. Prisma 初始化逻辑（已修复）

**文件**：`src/lib/prisma.ts`

**修改前**：
```typescript
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**问题**：生产环境（`NODE_ENV === 'production'`）时没有初始化 prisma

**修复后**：
```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

// 确保 production 环境也正确初始化
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
```

---

## 🔍 其他可能的原因

### 1. Vercel 环境变量未设置

**检查方法**：

#### 在 Vercel Dashboard 查看
1. 进入项目 → Settings → Environment Variables
2. 检查是否有 `DATABASE_URL`
3. 检查值是否正确（应该是 `postgres://...` 格式）

#### 在本地检查
```bash
# 拉取 Vercel 环境变量
vercel env pull .env.local

# 查看内容
cat .env.local | grep DATABASE_URL
```

---

### 2. 环境变量命名问题

Prisma 默认查找以下环境变量（按优先级）：

1. `DATABASE_URL` - **直接连接字符串**
2. `POSTGRES_PRISMA_URL` - Prisma 专用（推荐）
3. `POSTGRES_URL` - 原始 Postgres 连接
4. `SHADOW_DATABASE_URL` - Prisma 2.0+ 格式

**当前配置**：Vercel 自动注入 `DATABASE_URL` 和 `POSTGRES_PRISMA_URL`

---

### 3. 数据库连接字符串格式错误

**正确格式**：
```
postgres://用户名:密码@主机:端口/数据库?参数=值
```

**常见错误**：
- ❌ `postgresql://` (应该是 `postgres://`)
- ❌ 缺少密码
- ❌ 主机地址错误（使用了 localhost）

---

## 🛠️ 诊断步骤

### 步骤 1：验证环境变量

在 Vercel 部署日志中查看：

```bash
# 方法 1：查看部署日志
vercel logs

# 方法 2：在代码中添加调试日志
```

在任何 API 路由中添加：

```typescript
// src/app/api/votes/route.ts
import { prisma } from '@/lib/prisma';

export async function GET() {
  // 调试：打印环境变量
  console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
  console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
  console.log('[DEBUG] Prisma URL:', prisma._datasources?.[0]?.url);

  // 测试数据库连接
  try {
    await prisma.$connect();
    console.log('[DEBUG] 数据库连接成功');
  } catch (error) {
    console.error('[DEBUG] 数据库连接失败:', error);
    return NextResponse.json(
      { code: -1, error: '数据库连接失败', details: error.message },
      { status: 500 }
    );
  }

  // ... 其他代码
}
```

### 步骤 2：检查数据库连接

在 Vercel 控制台运行：

```bash
# 使用 Vercel CLI 检查环境变量
vercel env ls

# 应该看到：
# DATABASE_URL      (Set)      postgres://...
# POSTGRES_PRISMA_URL (Set) postgres://...
```

### 步骤 3：强制重新部署

```bash
# 触发重新部署
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

---

## 🎯 快速修复方案

### 方案 1：确保 Vercel 环境变量正确设置

1. **在 Vercel Dashboard 检查**：
   - 项目 → Settings → Environment Variables
   - 确认 `DATABASE_URL` 已设置且值正确
   - 确认环境选择为 **Production**（不是 Preview/Development）

2. **重新部署**：
   ```bash
   vercel --prod
   ```

### 方案 2：使用明确的 Prisma 连接（推荐）

修改 `src/lib/prisma.ts` 使用明确的连接：

```typescript
import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL!;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});
```

**优点**：
- ✅ 明确检查环境变量
- ✅ 错误信息更清晰
- ✅ 避免全局变量问题

### 方案 3：检查数据库提供商配置

如果使用 **Neon**（通过 Vercel Marketplace）：

1. 确认在 Vercel 已完成 Neon 集成
2. 检查 Neon 控制台，确认数据库已创建
3. 复制 Neon 控制台显示的连接字符串
4. 在 Vercel 环境变量中使用该字符串

---

## 📊 验证清单

部署后访问以下端点验证：

- [ ] 首页加载正常
- [ ] `/api/health` 端点（如已实现）显示数据库状态
- [ ] 创建投票功能正常
- [ ] 数据能正常保存

---

## 💡 预防措施

1. **始终使用环境变量**
   - 不要在代码中硬编码数据库连接
   - 使用 `process.env.DATABASE_URL`

2. **本地开发也使用环境变量**
   - 复制 `.env.example` 到 `.env.local`
   - 保持本地和云端配置一致

3. **使用 `.vercelignore` 排除敏感文件**
   - 确保 `.env`、`.env.local` 不会被部署

---

**Sources**:
- [Prisma Environment Variables](https://www.prisma.io/docs/guides/environment-variables-reference)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
