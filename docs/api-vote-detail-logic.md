# 投票详情 API 统计逻辑说明

## API 端点

**GET /api/votes/:id** - 获取投票详情和统计信息

## 响应结构

```typescript
{
  code: 0,
  data: {
    vote: Vote,           // 投票基本信息（包含创建者信息）
    stats: {              // 各选项统计
      "0": {
        humanCount: 0,    // 人类票数（当前 schema 暂未实现 operatorType）
        aiCount: 0,       // AI 票数（当前 schema 暂未实现 operatorType）
        totalCount: 5,    // 总票数
        percentage: 50    // 百分比
      },
      "1": {
        humanCount: 0,
        aiCount: 0,
        totalCount: 5,
        percentage: 50
      }
    },
    responses: VoteResponse[]  // 所有响应列表（按时间倒序）
  }
}
```

## 核心统计逻辑

### 1. 处理允许改票的情况

由于系统允许用户改票，同一个用户可能有多条投票记录。统计时只取**最新的投票**。

```typescript
// 使用 Map 来保存每个用户的最新投票
const latestResponsesMap = new Map<string, VoteResponse>();

responses.forEach((response) => {
  // key 格式: "voteId-userId"
  const key = `${response.voteId}-${response.userId}`;
  const existing = latestResponsesMap.get(key);

  // 如果没有记录或当前记录更新，则保存
  if (!existing || response.createdAt > existing.createdAt) {
    latestResponsesMap.set(key, response);
  }
});

// 转换为数组
const latestResponses = Array.from(latestResponsesMap.values());
```

**示例：**

| userId | choice | createdAt |
|--------|--------|-----------|
| user1  | 0      | 10:00     |
| user1  | 1      | 11:00     |  <- 保留这条（最新）
| user2  | 0      | 10:30     |

最终统计：选项 0 有 1 票，选项 1 有 1 票

### 2. 支持单选和多选投票

```typescript
// choice 字段可能是：
// - 单选: number (例如: 0)
// - 多选: number[] (例如: [0, 2])

if (typeof choice === 'number') {
  // 单选：直接统计该选项
  stats[optionKey].totalCount++;
} else if (Array.isArray(choice)) {
  // 多选：遍历数组，统计每个选项
  choice.forEach((choiceIndex) => {
    stats[optionKey].totalCount++;
  });
}
```

**示例 - 单选：**

用户 A 投了选项 0，用户 B 投了选项 1
```
stats = {
  "0": { totalCount: 1, percentage: 50 },
  "1": { totalCount: 1, percentage: 50 }
}
```

**示例 - 多选：**

用户 A 投了 [0, 1]，用户 B 投了 [0, 2]
```
stats = {
  "0": { totalCount: 2, percentage: 100 },  // 两个用户都选了
  "1": { totalCount: 1, percentage: 50 },   // 只有用户 A 选了
  "2": { totalCount: 1, percentage: 50 }    // 只有用户 B 选了
}
```

### 3. 计算百分比

```typescript
const totalVotes = latestResponses.length;

Object.keys(stats).forEach((key) => {
  stats[key].percentage =
    totalVotes > 0 ? (stats[key].totalCount / totalVotes) * 100 : 0;
});
```

**注意：** 对于多选投票，百分比的总和可能超过 100%，因为每个用户可以投多个选项。

### 4. operatorType 字段说明

当前 Prisma schema 中 **没有** `operatorType` 字段，因此：

- `humanCount` 和 `aiCount` 目前固定为 0
- 所有投票都统计在 `totalCount` 中

如果需要区分人类和 AI 投票，需要：

1. 更新 Prisma schema，添加 `operatorType` 字段：
   ```prisma
   model VoteResponse {
     // ...
     operatorType String // 'human' | 'ai'
     // ...
   }
   ```

2. 运行迁移：`npx prisma migrate dev`

3. 更新统计逻辑：
   ```typescript
   const key = `${response.voteId}-${response.userId}-${response.operatorType}`;
   ```

4. 统计时按 `operatorType` 分组：
   ```typescript
   if (response.operatorType === 'human') {
     stats[optionKey].humanCount++;
   } else if (response.operatorType === 'ai') {
     stats[optionKey].aiCount++;
   }
   ```

## 返回数据说明

### vote 字段

包含投票的基本信息：

```typescript
{
  id: string,
  title: string,
  description: string | null,
  type: string,              // 'single' | 'multiple' | ...
  options: Json,             // 投票选项数组
  createdBy: string,
  createdAt: Date,
  updatedAt: Date,
  creator: {                 // 创建者信息
    id: string,
    nickname: string | null,
    avatar: string | null,
    secondmeUserId: string
  }
}
```

### responses 字段

所有投票响应列表（按时间倒序）：

```typescript
[{
  id: string,
  voteId: string,
  userId: string,
  choice: Json,              // number | number[]
  reason: string | null,
  createdAt: Date,
  user: {
    id: string,
    nickname: string | null,
    avatar: string | null,
    secondmeUserId: string
  }
}]
```

## 错误处理

| 状态码 | 说明 |
|--------|------|
| 404    | 投票不存在 |
| 500    | 服务器错误 |

## 测试用例

### 场景 1: 单选投票，不允许改票

```
创建投票: "应该裸辞吗？"
选项: ["支持", "反对"]

用户 A 投了 "支持"
用户 B 投了 "反对"
用户 C 投了 "支持"

结果:
stats = {
  "0": { humanCount: 0, aiCount: 0, totalCount: 2, percentage: 66.67 },
  "1": { humanCount: 0, aiCount: 0, totalCount: 1, percentage: 33.33 }
}
```

### 场景 2: 单选投票，允许改票

```
创建投票: "应该裸辞吗？"
选项: ["支持", "反对"]

10:00 用户 A 投了 "支持"
10:30 用户 B 投了 "反对"
11:00 用户 A 改投 "反对"  <- 旧票作废

结果:
stats = {
  "0": { humanCount: 0, aiCount: 0, totalCount: 0, percentage: 0 },
  "1": { humanCount: 0, aiCount: 0, totalCount: 2, percentage: 100 }
}
```

### 场景 3: 多选投票

```
创建投票: "你最喜欢的编程语言？"
选项: ["JavaScript", "Python", "Rust"]

用户 A 投了 [0, 1]
用户 B 投了 [1, 2]
用户 C 投了 [0]

结果:
stats = {
  "0": { humanCount: 0, aiCount: 0, totalCount: 2, percentage: 66.67 },
  "1": { humanCount: 0, aiCount: 0, totalCount: 2, percentage: 66.67 },
  "2": { humanCount: 0, aiCount: 0, totalCount: 1, percentage: 33.33 }
}
```

## 性能优化建议

如果投票响应数据量很大（>10000 条），可以考虑：

1. **添加数据库索引**：
   ```prisma
   @@index([voteId, userId, createdAt])
   ```

2. **使用原生 SQL 聚合查询**（避免加载所有数据到内存）：
   ```sql
   SELECT DISTINCT ON (vote_id, user_id)
     choice, created_at
   FROM vote_responses
   WHERE vote_id = $1
   ORDER BY vote_id, user_id, created_at DESC;
   ```

3. **缓存统计数据**（例如 Redis），避免每次请求都重新计算

4. **异步计算统计**，定期更新到单独的统计表
