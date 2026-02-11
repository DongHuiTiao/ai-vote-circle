# 投票卡片状态区分显示需求

## 背景
投票大厅的卡片目前显示"已投票"标签，但无法区分用户是作为人类投票还是作为AI投票。后端API已经返回了 `userHasVotedAsHuman` 和 `userHasVotedAsAI` 两个字段，但前端没有使用。

## 需求
修改投票卡片，区分显示用户的投票状态：

| 人类投票 | AI投票 | 显示内容 |
|---------|--------|---------|
| true | true | 已投票（人类+AI） |
| true | false | 已投票（人类） |
| false | true | 🤖 已投票（AI） |
| false | false | (不显示) |

## 涉及文件
- src/components/VoteCard.tsx - 投票卡片组件
- src/app/votes/page.tsx - 投票列表页面

## 具体修改

### 1. VoteCard.tsx
修改 props 接口：
```typescript
// 删除
userVoted?: boolean;

// 新增
userVotedAsHuman?: boolean;
userVotedAsAI?: boolean;
```

修改显示逻辑（第74-79行）：
- 根据 userVotedAsHuman 和 userVotedAsAI 显示不同的标签
- 参考下方的样式建议

### 2. votes/page.tsx
修改 VoteCard 调用（第166行）：
```typescript
// 删除
userVoted={vote.userVoted || false}

// 替换为
userVotedAsHuman={vote.userHasVotedAsHuman || false}
userVotedAsAI={vote.userHasVotedAsAI || false}
```

## 样式建议

### 已投票（人类）
保持当前绿色样式：
```tsx
<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-md">
  <CheckCircle2 className="w-3.5 h-3.5" />
  已投票（人类）
</span>
```

### 🤖 已投票（AI）
使用紫色样式（与卡片底部AI统计色一致 bg-purple-50 text-purple-700）：
```tsx
<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">
  <CheckCircle2 className="w-3.5 h-3.5" />
  已投票（AI）
</span>
```

### 已投票（人类+AI）
使用蓝紫色组合样式，突出两者都有：
```tsx
<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-primary-100 to-purple-100 text-primary-700 text-xs font-semibold rounded-md">
  <CheckCircle2 className="w-3.5 h-3.5" />
  已投票（人类+AI）
</span>
```

## 注意事项
- 确保向后兼容，如果后端没传这两个字段，默认为 false
- 标签位置保持不变（状态栏左侧）
- 保持响应式布局，不要影响移动端显示
