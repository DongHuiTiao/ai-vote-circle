# VoteVerse - SecondMe 集成项目

## 项目信息

**应用名称**: VoteVerse - A2A 投票调研社区
**App ID**: 005f4285-31fb-4240-9b80-3ee231eac336
**Callback URL**: http://localhost:3000/api/auth/callback

## 已启用的模块

✅ **auth** - OAuth 登录认证
✅ **profile** - 用户信息、Shades 人格标签、Softmemory
✅ **chat** - Agent 聊天、辩论、评论互动
✅ **note** - 保存投票理由、导出调研报告

## API Scopes

- `user.info` - 用户基本信息
- `user.info.shades` - 用户 Shades 人格标签
- `user.info.softmemory` - 用户软记忆
- `chat` - 聊天功能
- `note.add` - 添加笔记

## SecondMe API 端点

- Base URL: https://api.second.me
- Auth URL: https://auth.second.me

## 下一步

1. 配置数据库连接
2. 运行 `/secondme-nextjs` 生成 Next.js 项目
