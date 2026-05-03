# 推进流程提示词拼接文档

## 概述

XTPlay 有三种主要的推进流程，每种流程都会构建不同的提示词与 LLM 交互。所有提示词最终都转换为 OpenAI Chat Completions 的 `messages` 数组。

---

## 1. Manual Advance（手动推进）

### 触发条件
用户点击 "Advance" 按钮，在 Manual 模式下直接触发。

### 入口函数
```
advanceGroundRound(ground, options)
```

### options 参数
```typescript
{
  instructions?: string,      // 用户输入的指令
  event?: RoundEvent | null,  // 用户选择的事件
  excludedRoleIds?: string[],  // 被排除的角色
  messageScope?: "public" | "batch_only",
  dryRun?: boolean,
}
```

### 提示词拼接

#### System Prompt
```
roleExecutionSystemLines.join("\n\n") + "\n\n" + role.system_prompt.trim()
```

其中 `roleExecutionSystemLines` 包含：
```
You are one actor inside a persistent multi-role simulation.
Stay fully in character and reason only from information this role can currently access: rules, public knowledge, visible peers, private knowledge, and inbox messages.
You are deciding one batch action, not writing a full story.
Do not infer another role's hidden identity only from moderator wording, global role labels, or the fact that a round is currently executing.
You may send different messages to different roles in the same round by using multiple entries in output[].
Each output item must target exactly one visible role name or the literal string "all".
If your status is silent, avoid sending messages unless the event or rules explicitly require it.
Return a single JSON object that matches the provided output_schema. Do not include markdown fences or extra prose.
Your Next Step suggestions must be at the minimal level and cannot simply rely on changes over time to determine which roles enter the current batch. You need to carefully consider which roles should participate in the minimal events at the current stage.
```

#### User Prompt（JSON）
```json
{
  "task": "Generate the next action for this role in the simulation batch.",
  "instructions": "{{user_instructions}}",
  "event_instructions": "{{event_title}}: {{event_prompt}}",
  "round_goal": "{{ground.simulation.round_goal}}",
  "selected_for_current_batch": true,
  "current_step_message_scope": "{{messageScope}}",
  "allowed_message_targets": ["{{role_name_1}}", "{{role_name_2}}", ...],
  "ground": {
    "name": "{{ground.name}}",
    "description": "{{ground.description}}",
    "knowledge": ["{{knowledge_1}}", "{{knowledge_2}}", ...],
    "rule": ["{{rule_1}}", "{{rule_2}}", ...]
  },
  "role": {
    "id": "{{role.id}}",
    "kind": "{{role.kind}}",
    "name": "{{role.name}}",
    "description": "{{role.description}}",
    "use_prompt": "{{role.use_prompt}}",
    "status": "{{role.status}}",
    "redundancy": {{role.redundancy}},
    "blocked_role_names": ["{{blocked_name}}", ...],
    "unknown_role_names": ["{{unknown_name}}", ...],
    "inbox": ["[Round N] Sender: content", ...],
    "private_knowledge": ["{{private_knowledge}}", ...],
    "public_knowledge": ["{{public_knowledge}}", ...]
  },
  "visible_peers": [
    {
      "id": "{{peer.id}}",
      "name": "{{peer.name}}",
      "status": "{{peer.status}}",
      "enabled": {{peer.enabled}},
      "public_knowledge_count": {{peer.public_knowledge_count}},
      "inbox_seen_by_them": {{peer.inbox_seen_by_them}}
    }
  ],
  "information_scope": [
    "You only know what is in your private knowledge, public knowledge, inbox, ground public state, and visible_peers.",
    "You do not know another role's hidden identity unless it is explicitly revealed by your own knowledge sources."
  ],
  "messaging_rules": [
    "output[] may contain zero or more messages.",
    "Use one array item per distinct target message.",
    "If Alice and Bob should receive different content, emit two separate output items.",
    "The role field must be one visible role name or \"all\".",
    "For this current step, only names in allowed_message_targets are valid message targets."
  ],
  "recent_rounds": [
    {
      "round": {{round_number}},
      "event": {{event_object_or_null}},
      "summary": "{{round_summary}}",
      "output": [...],
      "votes": [...]
    }
  ],
  "output_schema": {
    "think": "string",
    "summary": "string",
    "knowledge_private": ["string"],
    "knowledge_public": ["string"],
    "status": "active | silent | dead",
    "redundancy": 0,
    "output": [{"role": "target", "content": "message"}],
    "vote": [{"thing": "what", "role": "who", "vote": 1}]
  }
}
```

---

## 2. Ask Saint For Next Step（询问 Saint 计划）

### 触发条件
用户点击 "Ask Saint For Next Step" 按钮，在 Auto 模式下触发。

### 入口函数
```
proposeSaintPlan(ground, options)
```

### 提示词拼接

#### System Prompt
```
saintPlanSystemLines.join("\n\n") + "\n\n" + saint.system_prompt.trim()
```

其中 `saintPlanSystemLines` 包含：
```
You are saint, the optional host and moderator of this simulation.
Your job is to inspect the current scene and propose the next moderator step.
Propose four things only: a concise moderator instruction, an optional structured event, the exact non-saint roles that should act next, and the message_scope for that step.
If proposing an event, give it a descriptive title that fits the current narrative context. The title should be specific and meaningful, not generic like 'Custom Event'.
Choose only enabled, living, non-saint roles in batch_role_names.
Prefer the smallest batch that meaningfully advances the scene.
Use message_scope=batch_only for any secret or restricted communication phase.
Use message_scope=public for openly discussed phases where selected roles may communicate broadly.
Do not hardcode game-specific assumptions unless they are explicitly justified by the stored rules or your own saint prompt.
Do not execute anything. This plan is only a proposal for human approval.
Return a single JSON object that matches the provided output_schema. Do not include markdown fences or extra prose.
```

#### User Prompt（JSON）
```json
{
  "task": "Propose the next host plan for the simulation.",
  "ground": {
    "name": "{{ground.name}}",
    "description": "{{ground.description}}",
    "knowledge": ["{{knowledge}}", ...],
    "rule": ["{{rule}}", ...]
  },
  "simulation": {
    "batch_size": {{batch_size}},
    "current_batch_index": {{current_batch_index}},
    "mode": "{{mode}}",
    "round_goal": "{{round_goal}}"
  },
  "planning_guardrails": [
    "One approved plan should represent one coherent execution step.",
    "Use message_scope=batch_only only when the current step should stay private or internally scoped.",
    "Use message_scope=public only when the current step is openly visible communication.",
    "Scene-specific scheduling rules should come from stored rules and saint prompt, not from unstated assumptions."
  ],
  "available_roles": [
    {
      "id": "{{role.id}}",
      "name": "{{role.name}}",
      "description": "{{role.description}}",
      "status": "{{role.status}}",
      "redundancy": {{role.redundancy}},
      "inbox_size": {{role.inbox.length}}
    }
  ],
  "recent_rounds": [
    {
      "round": {{round_number}},
      "event": {{event_object_or_null}},
      "summary": "{{summary}}",
      "batch": ["{{role_id}}", ...],
      "output": [...],
      "votes": [...]
    }
  ],
  "output_schema": {
    "summary": "short summary for the host proposal",
    "reasoning": "why this plan is appropriate",
    "instructions": "the moderator instruction for the next step",
    "event": {
      "type": "custom",
      "title": "event title",
      "prompt": "event prompt"
    },
    "batch_role_names": ["exact role name"],
    "message_scope": "public | batch_only"
  }
}
```

### Saint Plan 输出结构
```json
{
  "summary": "saint proposes to advance the night phase",
  "reasoning": "The village has collected enough information to proceed with the next dramatic step.",
  "instructions": "Let the night roles act: the seer should check one player.",
  "event": {
    "type": "night_falls",
    "title": "Night Falls on the Village",
    "prompt": "Night falls. The seer wakes and may check one player's identity."
  },
  "batch_role_names": ["seer-abc123", "werewolf-xyz789"],
  "message_scope": "batch_only"
}
```

---

## 3. Approve And Execute（审批并执行）

### 触发条件
用户审批 saint 提出的计划后，系统执行推进，然后调用 `proposeSaintJudgement()` 请求 saint 生成审判结果。

### 入口函数
```
proposeSaintJudgement(ground, round, options)
```

### 提示词拼接

#### System Prompt
```
saintJudgementSystemLines.join("\n\n") + "\n\n" + saint.system_prompt.trim()
```

其中 `saintJudgementSystemLines` 包含：
```
You are saint, the optional host and referee of this simulation.
The round has already executed. Your job is to review what happened and propose only the state changes that should be considered by the human.
Only emit role_updates when the rules, event outcome, or observed actions clearly justify a patch.
Do not patch roles just to make the story more dramatic.
Do not execute anything. Every patch is only a proposal for human approval.
Return a single JSON object that matches the provided output_schema. Do not include markdown fences or extra prose.
```

#### User Prompt（JSON）
```json
{
  "task": "Review the executed round and propose any role patches that should be approved by the user.",
  "rules": ["{{rule}}", ...],
  "public_knowledge": ["{{knowledge}}", ...],
  "role_state": [
    {
      "id": "{{role.id}}",
      "kind": "{{role.kind}}",
      "name": "{{role.name}}",
      "description": "{{role.description}}",
      "status": "{{role.status}}",
      "redundancy": {{role.redundancy}},
      "enabled": {{role.enabled}},
      "blocked_role_names": ["{{name}}", ...],
      "unknown_role_names": ["{{name}}", ...],
      "inbox": ["{{entry}}", ...],
      "knowledge_private": ["{{knowledge}}", ...],
      "knowledge_public": ["{{knowledge}}", ...]
    }
  ],
  "executed_round": {
    "round": {{round_number}},
    "createdAt": "{{timestamp}}",
    "batch": ["{{role_id}}", ...],
    "instructions": "{{instructions}}",
    "summary": "{{summary}}",
    "event": {{event_object_or_null}},
    "before": {{ground_snapshot}},
    "after": {{ground_snapshot}},
    "output": [
      {"from": "{{sender}}", "role": "{{recipient}}", "content": "{{message}}"}
    ],
    "votes": [
      {"thing": "{{thing}}", "role": "{{target}}", "vote": {{count}}, "from": "{{voter}}"}
    ],
    "roleActions": [
      {
        "roleId": "{{id}}",
        "roleName": "{{name}}",
        "roleKind": "{{kind}}",
        "mode": "{{mode}}",
        "think": "{{think}}",
        "summary": "{{summary}}",
        "knowledge_private": ["{{knowledge}}", ...],
        "knowledge_public": ["{{knowledge}}", ...],
        "output": [...],
        "vote": [...]
      }
    ]
  },
  "output_schema": {
    "summary": "short summary of the host judgement",
    "reasoning": "why patches should be applied",
    "role_updates": [
      {
        "role": "target role name",
        "reason": "why the patch is applied",
        "status": "active | silent | dead",
        "redundancy": 0,
        "enabled": true,
        "blocked_role_names": ["role-name"],
        "unknown_role_names": ["role-name"],
        "knowledge_private_add": ["string"],
        "knowledge_public_add": ["string"],
        "inbox_add": ["string"]
      }
    ]
  }
}
```

### Saint Judgement 输出结构
```json
{
  "summary": "saint proposes death to the player with highest votes",
  "reasoning": "The death vote event concluded with player-123 receiving 3 votes, the highest count.",
  "role_updates": [
    {
      "role": "player-123",
      "reason": "Received highest vote count in death vote event.",
      "status": "dead",
      "knowledge_private_add": [],
      "knowledge_public_add": ["player-123 was voted out and eliminated."],
      "inbox_add": []
    }
  ]
}
```

---

## 4. 流程时序图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Manual Advance                                  │
│  User → advanceRound() → buildRoleMessages() → LLM → RoleAction         │
│                                ↓                                         │
│                        deliverMessages()                                 │
│                                ↓                                         │
│                      mergeRoleAction() → newRound                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    Ask Saint For Next Step                              │
│  User → proposeSaintPlan() → buildSaintPlanMessages() → LLM → SaintPlan │
│                                ↓                                         │
│                         pending_plan                                     │
│                                ↓                                         │
│                         UI: Show Plan                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      Approve And Execute                                 │
│  User approves plan → advanceGroundRound() → buildRoleMessages() → LLM   │
│                                ↓                                         │
│                         newRound created                                 │
│                                ↓                                         │
│  proposeSaintJudgement() → buildSaintJudgementMessages() → LLM           │
│                                ↓                                         │
│                      pending_judgement                                   │
│                                ↓                                         │
│                    User approves judgement                               │
│                                ↓                                         │
│                 applySaintJudgementToGround()                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 示例：Manual Advance 完整提示词

### 场景
- Ground: "狼人杀测试场"
- 角色: seer (预言家)
- 用户指令: "进入夜晚阶段"
- 事件: night_falls
- 批次角色: seer, werewolf

### 拼接后的 System Message
```
You are one actor inside a persistent multi-role simulation.
Stay fully in character and reason only from information this role can currently access: rules, public knowledge, visible peers, private knowledge, and inbox messages.
You are deciding one batch action, not writing a full story.
Do not infer another role's hidden identity only from moderator wording, global role labels, or the fact that a round is currently executing.
You may send different messages to different roles in the same round by using multiple entries in output[].
Each output item must target exactly one visible role name or the literal string "all".
If your status is silent, avoid sending messages unless the event or rules explicitly require it.
Return a single JSON object that matches the provided output_schema. Do not include markdown fences or extra prose.
Your Next Step suggestions must be at the minimal level and cannot simply rely on changes over time to determine which roles enter the current batch. You need to carefully consider which roles should participate in the minimal events at the current stage.

你是狼人杀游戏中的预言家。每晚你可以查验一名玩家的身份。
```

### 拼接后的 User Message（部分字段）
```json
{
  "task": "Generate the next action for this role in the simulation batch.",
  "instructions": "进入夜晚阶段",
  "event_instructions": "Night Falls on the Village: Night falls. The seer wakes and may check one player's identity.",
  "round_goal": "通过对话和投票找出狼人",
  "selected_for_current_batch": true,
  "current_step_message_scope": "batch_only",
  "allowed_message_targets": ["seer", "werewolf"],
  "ground": {
    "name": "狼人杀测试场",
    "description": "一个标准的狼人杀游戏场景",
    "knowledge": ["今天是第1天", "还没有玩家死亡"],
    "rule": ["预言家每晚可以查验一名玩家", "狼人每晚可以杀一名玩家", "村民需要在白天投票出局狼人"]
  },
  "role": {
    "id": "seer-abc123",
    "kind": "role",
    "name": "seer",
    "description": "预言家 - 拥有查验玩家身份的能力",
    "use_prompt": "你是狼人杀中的预言家。你可以通过查验得知某位玩家的真实身份。",
    "status": "active",
    "redundancy": 0,
    "blocked_role_names": [],
    "unknown_role_names": [],
    "inbox": [],
    "private_knowledge": ["你是预言家", "你的任务是找出狼人"],
    "public_knowledge": []
  },
  "visible_peers": [
    {
      "id": "werewolf-xyz789",
      "name": "werewolf",
      "status": "active",
      "enabled": true,
      "public_knowledge_count": 0,
      "inbox_seen_by_them": 0
    }
  ],
  "information_scope": [
    "You only know what is in your private knowledge, public knowledge, inbox, ground public state, and visible_peers.",
    "You do not know another role's hidden identity unless it is explicitly revealed by your own knowledge sources."
  ],
  "messaging_rules": [
    "output[] may contain zero or more messages.",
    "Use one array item per distinct target message.",
    "If Alice and Bob should receive different content, emit two separate output items.",
    "The role field must be one visible role name or \"all\".",
    "For this current step, only names in allowed_message_targets are valid message targets."
  ],
  "recent_rounds": [],
  "output_schema": {
    "think": "string",
    "summary": "string",
    "knowledge_private": ["string"],
    "knowledge_public": ["string"],
    "status": "active | silent | dead",
    "redundancy": 0,
    "output": [{"role": "target", "content": "message"}],
    "vote": [{"thing": "what", "role": "who", "vote": 1}]
  }
}
```