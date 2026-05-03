# 角色模拟字段设计与结构化输出

## 1. 角色配置 (RoleConfig)

角色是模拟世界的参与主体，每个角色拥有独立的大语言模型配置和状态管理。

### 基础字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识符，格式为 `{name}-{random}` |
| `kind` | `"role"` \| `"saint"` | 角色类型，`role` 为普通角色，`saint` 为主持人角色 |
| `name` | string | 角色名称，用于消息寻址和识别 |
| `description` | string | 角色公开描述，用于向其他角色展示身份 |
| `use_prompt` | string | 角色使用说明，描述角色使命和行为风格 |
| `system_prompt` | string | 系统级规则约束，定义决策逻辑和隐藏信息 |
| `model` | string | LLM 模型名称，为空则继承 Ground 默认值 |
| `key` | string | API 密钥，为空则继承 Ground 默认值 |
| `url` | string | API 地址，为空则继承 Ground 默认值 |
| `temperature` | number | 生成温度参数，范围 0~2，默认 0.7 |

### 状态字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | `"active"` \| `"silent"` \| `"dead"` | 角色状态，活跃、沉默、死亡 |
| `redundancy` | number | 冗余计数，用于标记被投票死后的状态 |
| `enabled` | boolean | 是否启用，禁用的角色不参与模拟 |

### 感知字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `knowledge_private` | string[] | 私有知识，仅角色自身可见 |
| `knowledge_public` | string[] | 公开知识，全局可见 |
| `blocked_role_names` | string[] | 屏蔽列表，无法向列表中的角色发消息 |
| `unknown_role_names` | string[] | 未知列表，无法感知列表中角色的存在 |
| `inbox` | string[] | 收件箱，存储收到的消息，格式为 `[Round N] Sender: content` |

### 状态追踪

| 字段 | 类型 | 说明 |
|------|------|------|
| `last_think` | string | 最近一次推理内容 |
| `last_error` | string | 最近一次错误信息 |

---

## 2. 角色动作输出 (RoleAction)

角色在每个回合需要输出结构化的动作对象，通过 Zod 验证。

```typescript
{
  think: string,           // 推理过程（内部使用，不直接展示）
  summary: string,         // 动作摘要
  knowledge_private: string[],  // 本轮新增私有知识
  knowledge_public: string[],  // 本轮新增公开知识
  status: "active" | "silent" | "dead",  // 状态变更
  redundancy: number,      // 冗余计数变更
  output: [               // 发送的消息列表
    {
      role: string,       // 目标角色名或 "all"
      content: string,    // 消息内容
    }
  ],
  vote: [                 // 投票列表
    {
      thing: string,      // 投票主题
      role: string,      // 被投票的角色名
      vote: number,      // 票数，通常为 1
    }
  ],
}
```

### 输出示例

```json
{
  "think": "我注意到狼人的行为模式可疑，结合昨晚的死亡信息...",
  "summary": "预言家查验了猎人并分享了重要信息",
  "knowledge_private": ["猎人昨晚没有使用技能"],
  "knowledge_public": ["预言家声称猎人不是狼人"],
  "status": "active",
  "redundancy": 0,
  "output": [
    { "role": "all", "content": "我认为应该先投掉这个可疑的人" }
  ],
  "vote": [
    { "thing": "death_vote", "role": "可疑者", "vote": 1 }
  ]
}
```

---

## 3. Saint 角色特殊输出

`saint` 是主持人角色，输出结构与普通角色不同。

### Saint 行动计划 (SaintPlan)

```typescript
{
  summary: string,        // 计划摘要
  reasoning: string,      // 制定理由
  instructions: string,   // 主持人指令
  event: {                // 可选的事件
    type: "custom" | "death_vote",
    title: string,
    prompt: string,
  },
  batch_role_names: string[],  // 本轮选中的角色名列表
  message_scope: "public" | "batch_only",
}
```

### Saint 审判结果 (SaintJudgement)

```typescript
{
  createdAt: string,
  round: number,
  summary: string,        // 审判摘要
  reasoning: string,     // 判决理由
  role_updates: [         // 角色状态变更
    {
      role: string,      // 目标角色名
      reason: string,    // 变更原因
      status?: "active" | "silent" | "dead",
      redundancy?: number,
      enabled?: boolean,
      blocked_role_names?: string[],
      unknown_role_names?: string[],
      knowledge_private_add?: string[],
      knowledge_public_add?: string[],
      inbox_add?: string[],
    }
  ],
}
```

---

## 4. 回合记录 (RoundRecord)

每个回合执行后生成完整的执行记录。

```typescript
{
  round: number,                    // 回合编号
  createdAt: string,                // 创建时间
  batch: string[],                   // 本轮参与的角色 ID 列表
  instructions: string,             // 本轮主持人指令
  summary: string,                  // 回合摘要
  event: RoundEvent | null,         // 触发的事件
  before: GroundSnapshot,            // 执行前的快照
  after: GroundSnapshot,             // 执行后的快照
  output: RoleMessage[],             // 投递的消息列表
  votes: RoleVote[],                 // 收集的投票列表
  roleActions: RoleActionRecord[],   // 各角色的执行记录
}
```

---

## 5. Ground 快照 (GroundSnapshot)

用于记录回合前后的世界状态，便于审计和回滚。

```typescript
{
  id: string,
  name: string,
  description: string,
  knowledge: string[],              // 全局公开知识
  rule: string[],                   // 全局规则
  role: [
    {
      id: string,
      kind: "role" | "saint",
      name: string,
      status: RoleStatus,
      redundancy: number,
      enabled: boolean,
      knowledge_private: string[],
      knowledge_public: string[],
      blocked_role_names: string[],
      unknown_role_names: string[],
      inbox: string[],
      last_think: string,
      last_error: string,
    }
  ],
  simulation: SimulationConfig,
}
```

---

## 6. 消息传递规则

角色之间的消息传递受以下规则约束：

1. **死亡过滤** — 死者不能发送或接收消息
2. **沉默过滤** — `silent` 状态的角色不能主动发消息（除非事件强制要求）
3. **屏蔽过滤** — `blocked_role_names` 中的角色无法收到消息
4. **未知过滤** — 双方有一方在对方 `unknown_role_names` 中，则无法通信
5. **批处理范围** — `batch_only` 模式下，消息只能在当前批次角色之间传递

---

## 7. 投票机制

投票用于死亡投票等场景，支持多票和权重。

```typescript
{
  thing: string,    // 投票主题，如 "death_vote"
  role: string,    // 被投票的角色名
  vote: number,     // 票数，默认为 1
  from: string,    // 投票者名称（由系统填充）
}
```

---

## 8. 配置继承

角色的 `model`、`key`、`url` 字段如果为空，会自动继承 Ground 的默认值：

```typescript
const effectiveModel = role.model || ground.default_model;
const effectiveKey = role.key || ground.default_key;
const effectiveUrl = role.url || ground.default_url;
```

---

## 9. 状态转换

```
                    ┌──────────────┐
                    │    active    │ ◄──── 初始状态
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  silent  │ │   dead   │ │ disabled │
        └──────────┘ └──────────┘ └──────────┘
                           ▲
                           │
                    投票或其他事件触发
```

`silent` 状态的角色不能主动发送消息，但可以接收消息和参与投票。