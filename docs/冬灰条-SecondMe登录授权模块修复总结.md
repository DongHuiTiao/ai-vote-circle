# SecondMe OAuth 集成问题修复总结

## 问题概述

在集成 SecondMe OAuth2 登录功能时，遇到一系列配置错误导致授权流程失败。本文档记录了从问题发现到最终修复的完整过程。

## 初始症状

### 症状 1: Firebase "Site Not Found" 错误

- **现象**: 用户点击登录按钮后，看到 Firebase 托管的 404 页面
- **原因**: 用户访问了错误的 URL（可能是 Firebase 部署地址），而不是本地开发服务器 `http://localhost:3000`
- **解决**: 确认访问正确的本地开发地址

### 症状 2: 404 Not Found - NoSuchKey

- **现象**: OAuth 授权请求返回 404 错误，Key 为 `oauth/oauth/authorize`
- **原因**: URL 路径配置错误，导致路径重复
- **解决**: 修正 OAuth 端点配置

## 问题根源分析

### 根本原因

SecondMe Skill 生成的配置使用了**错误的 API 端点**，与官方文档不一致。

## 修复过程

### 阶段 1: 发现 API Base URL 配置错误

**错误配置**:

```env
SECONDME_API_BASE_URL=https://api.second.me
SECONDME_AUTH_URL=https://auth.second.me
```

**正确配置**（根据官方文档）:

```env
SECONDME_API_BASE_URL=https://app.mindos.com/gate/lab
SECONDME_AUTH_URL=https://go.second.me/oauth
```

**修改文件**:

- `.secondme/state.json`
- `.env.local`

**参考文档**: [SecondMe OAuth2 官方文档](https://develop-docs.second.me/zh/docs/authentication/oauth2)

---

### 阶段 2: 修复授权 URL 路径重复

**问题代码**:

```typescript
// src/app/api/auth/login/route.ts
const authUrl = `${process.env.SECONDME_AUTH_URL}/oauth/authorize?${params}`;
// 结果: https://go.second.me/oauth/oauth/authorize ❌
```

**修复后**:

```typescript
const authUrl = `${process.env.SECONDME_AUTH_URL}/?${params}`;
// 结果: https://go.second.me/oauth/?client_id=... ✅
```

**文件**: [src/app/api/auth/login/route.ts:31](src/app/api/auth/login/route.ts#L31)

---

### 阶段 3: 修复 Token 交换端点和请求格式

**问题代码**:

```typescript
// src/app/api/auth/callback/route.ts

// ❌ 错误的端点
const tokenResponse = await fetch(
  `${process.env.SECONDME_AUTH_URL}/token`,  // 错误！
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',  // 错误格式！
    },
    body: JSON.stringify({  // 错误格式！
      client_id: process.env.SECONDME_CLIENT_ID,
      client_secret: process.env.SECONDME_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.SECONDME_REDIRECT_URI,
    }),
  }
);
```

**修复后**:

```typescript
// ✅ 正确的端点和格式
const params = new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  redirect_uri: process.env.SECONDME_REDIRECT_URI!,
  client_id: process.env.SECONDME_CLIENT_ID!,
  client_secret: process.env.SECONDME_CLIENT_SECRET!,
});

const tokenResponse = await fetch(
  `${process.env.SECONDME_API_BASE_URL}/api/oauth/token/code`,  // 正确端点
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',  // 正确格式
    },
    body: params.toString(),  // 正确格式
  }
);
```

**关键差异**:

1. **端点 URL**: `${SECONDME_API_BASE_URL}/api/oauth/token/code`（而非 `${SECONDME_AUTH_URL}/token`）
2. **Content-Type**: `application/x-www-form-urlencoded`（而非 `application/json`）
3. **请求体**: URLSearchParams 编码（而非 JSON）

**文件**: [src/app/api/auth/callback/route.ts:27-44](src/app/api/auth/callback/route.ts#L27-L44)

---

### 阶段 4: 修复响应数据结构解析

**问题代码**:

```typescript
const tokenData = await tokenResponse.json();
// 假设响应直接是 tokenData，使用下划线命名
accessToken: tokenData.access_token ❌
refreshToken: tokenData.refresh_token ❌
expiresIn: tokenData.expires_in ❌
```

**修复后**:

```typescript
const tokenResult = await tokenResponse.json();

// SecondMe API 标准响应格式: { code: 0, data: {...} }
if (tokenResult.code !== 0) {
  throw new Error(`Token error: ${tokenResult.message || 'Unknown error'}`);
}

const tokenData = tokenResult.data;

// 使用驼峰命名
accessToken: tokenData.accessToken ✅
refreshToken: tokenData.refreshToken ✅
expiresIn: tokenData.expiresIn ✅
```

**文件**: [src/app/api/auth/callback/route.ts:52-59](src/app/api/auth/callback/route.ts#L52-L59)

---

## 完整的正确配置

### 环境变量 (`.env.local`)

```env
# SecondMe OAuth2 配置
SECONDME_CLIENT_ID=your_client_id
SECONDME_CLIENT_SECRET=your_client_secret
SECONDME_REDIRECT_URI=http://localhost:3000/api/auth/callback

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# SecondMe API（正确配置）
SECONDME_API_BASE_URL=https://app.mindos.com/gate/lab
SECONDME_AUTH_URL=https://go.second.me/oauth
```

### 授权 URL 构造

```typescript
// 正确格式
const params = new URLSearchParams({
  client_id: process.env.SECONDME_CLIENT_ID,
  redirect_uri: process.env.SECONDME_REDIRECT_URI,
  response_type: 'code',
  scope: ['user.info', 'user.info.shades', 'user.info.softmemory', 'chat', 'note.add'].join(' '),
  state: crypto.randomUUID(),
});

const authUrl = `https://go.second.me/oauth/?${params}`;
// 结果: https://go.second.me/oauth/?client_id=...&redirect_uri=...&response_type=code&scope=...&state=...
```

### Token 交换请求

```typescript
const params = new URLSearchParams({
  grant_type: 'authorization_code',
  code: authorization_code,
  redirect_uri: process.env.SECONDME_REDIRECT_URI,
  client_id: process.env.SECONDME_CLIENT_ID,
  client_secret: process.env.SECONDME_CLIENT_SECRET,
});

const response = await fetch('https://app.mindos.com/gate/lab/api/oauth/token/code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString(),
});

// 响应格式
{
  "code": 0,
  "data": {
    "accessToken": "lba_at_xxxxx...",
    "refreshToken": "lba_rt_xxxxx...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "scope": ["user.info", "chat"]
  }
}
```

## 关键经验教训

### 1. 永远以官方文档为准

- SecondMe Skill 生成的配置可能过时或不准确
- 遇到问题时应首先查阅官方文档
- 官方文档: https://develop-docs.second.me/zh/docs/authentication/oauth2

### 2. OAuth2 标准流程的常见陷阱

| 陷阱                   | 说明                                   | 解决方法                                                 |
| ---------------------- | -------------------------------------- | -------------------------------------------------------- |
| **URL 路径重复** | 配置中包含路径，代码又拼接一次导致重复 | 检查最终拼接的完整 URL                                   |
| **请求格式错误** | 混淆 JSON 和 form-urlencoded 格式      | 严格按文档要求使用 `application/x-www-form-urlencoded` |
| **响应结构误解** | 假设响应直接返回数据，忽略包装结构     | 注意 `{ code: 0, data: {...} }` 格式                   |
| **字段命名差异** | 混淆 snake_case 和 camelCase           | 使用文档中指定的命名规范                                 |

### 3. 调试技巧

#### 检查最终 URL

```typescript
console.log('Auth URL:', authUrl);
// 应该看到: https://go.second.me/oauth/?client_id=...&...
```

#### 检查请求详情

```typescript
if (!tokenResponse.ok) {
  const errorText = await tokenResponse.text();
  console.error('Token exchange failed:', {
    status: tokenResponse.status,
    body: errorText,
  });
}
```

#### 检查响应结构

```typescript
const tokenResult = await tokenResponse.json();
console.log('Token response:', JSON.stringify(tokenResult, null, 2));
// 检查是否有 code 和 data 字段
```

### 4. 开发环境注意事项

- 确保访问 `http://localhost:3000`（而非其他部署地址）
- 端口冲突时检查并清理占用进程
- 环境变量修改后需重启开发服务器

## 修改文件清单

| 文件                                   | 修改内容                                                |
| -------------------------------------- | ------------------------------------------------------- |
| `.secondme/state.json`               | 更新 `api.baseUrl` 和 `api.authUrl`                 |
| `.env.local`                         | 更新 `SECONDME_API_BASE_URL` 和 `SECONDME_AUTH_URL` |
| `src/app/api/auth/login/route.ts`    | 修复授权 URL 拼接                                       |
| `src/app/api/auth/callback/route.ts` | 修复 token 交换端点、请求格式、响应解析                 |

## 最终验证

登录成功后应看到：

1. 点击"使用 SecondMe 登录"按钮
2. 跳转到 `https://go.second.me/oauth/?client_id=...`
3. 授权后重定向回 `http://localhost:3000/api/auth/callback?code=...`
4. 自动重定向到首页显示"欢迎回来！"
5. 显示 SecondMe 用户 ID

## 相关资源

- [SecondMe OAuth2 官方文档](https://develop-docs.second.me/zh/docs/authentication/oauth2)
- [SecondMe API 参考](https://develop-docs.second.me/zh/docs/api-reference/secondme)
- [OAuth2 标准流程](https://oauth.net/2/)

---

**文档生成时间**: 2025-02-10
**修复者**: Claude (Anthropic)
**问题状态**: ✅ 已解决
