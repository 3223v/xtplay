# XTPlay API 文档

> 版本 1.1 | 最后更新: 2026-05-12 | 基础路径: `/api/v1`

## 目录

1. [通用说明](#通用说明)
2. [权限控制](#权限控制)
3. [认证](#认证)
4. [用户管理](#用户管理)
5. [提示词管理](#提示词管理)
6. [角色管理](#角色管理)
7. [预设管理](#预设管理)
8. [条目管理](#条目管理)
9. [世界书管理](#世界书管理)
10. [故事管理](#故事管理)
11. [故事轮次管理](#故事轮次管理)
12. [故事生成](#故事生成)

---

## 通用说明

### 基础 URL

```
http://localhost:8000/api/v1
```

### 认证方式

使用 HTTP Header `X-User-Id` 传递当前登录用户 ID。所有业务接口（除 `/auth/*` 外）均需认证。

```
X-User-Id: 1
```

### 响应格式

成功响应直接返回 JSON 对象或数组。错误响应格式：

```json
{
  "detail": "错误描述信息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| `200` | 请求成功 |
| `201` | 创建成功 |
| `204` | 删除成功（无响应体） |
| `400` | 请求参数错误 |
| `401` | 未认证（缺少 X-User-Id 或用户不存在） |
| `403` | 权限不足（需要管理员或超级管理员权限） |
| `404` | 资源不存在 |
| `500` | 服务器内部错误 |
| `502` | LLM 调用失败 |

### 通用 CRUD 模式

角色、预设、条目、世界书、故事遵循统一 CRUD 模式：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/resource` | 列表查询 |
| `GET` | `/resource/{id}` | 获取单个 |
| `POST` | `/resource` | 新增 |
| `PUT` | `/resource/{id}` | 全量替换 |
| `PATCH` | `/resource/{id}` | 部分更新 |
| `DELETE` | `/resource/{id}` | 删除 |

PATCH 请求仅需传递要更新的字段，未传递字段保持不变。

---

## 权限控制

系统采用三级角色权限模型：

| 角色 | 值 | 说明 |
|------|-----|------|
| 普通用户 | `normal` | 管理自己的资源（角色、预设、条目、世界书、故事） |
| 管理员 | `admin` | 普通用户权限 + 提示词管理 + 用户管理 |
| 超级管理员 | `super_admin` | 管理员全部权限，且其账户信息仅可由本人修改 |

权限矩阵：

| 功能 | normal | admin | super_admin |
|------|--------|-------|-------------|
| 自己的资源 CRUD | ✅ | ✅ | ✅ |
| 提示词管理 | ❌ | ✅ | ✅ |
| 用户列表/查看 | ❌ | ✅ | ✅ |
| 修改其他用户信息 | ❌ | ✅ | ✅（本人除外） |
| 修改超级管理员信息 | ❌ | ❌ | ✅（仅本人） |
| 修改用户角色 | ❌ | ✅ | ✅（超级管理员角色不可改） |

---

## 认证

### POST `/auth/register` — 用户注册

创建新用户账户。新用户默认为 `normal` 角色。

**请求体：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `username` | `string` | 是 | — | 用户名（1-64 字符，不区分大小写唯一） |
| `password` | `string` | 是 | — | 密码（1-128 字符） |
| `email` | `string` | 否 | `""` | 邮箱（最多 255 字符） |

**响应 `201`：**

```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "normal"
  }
}
```

**错误：**
- `400` — 用户名为空、密码为空、用户名已存在

---

### POST `/auth/login` — 用户登录

验证用户凭证。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | `string` | 是 | 用户名（前后空格会被截断） |
| `password` | `string` | 是 | 密码 |

**响应 `200`：**

```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "normal"
  }
}
```

**错误：**
- `401` — 用户名或密码错误

---

## 用户管理

用户管理接口需要管理员权限（`admin` 或 `super_admin` 角色）。

### GET `/auth/users` — 用户列表

获取所有用户信息。需要管理员权限。

**请求头：** `X-User-Id: <管理员用户ID>`

**响应 `200`：**

```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "super_admin"
  },
  {
    "id": 2,
    "username": "testuser",
    "email": "test@example.com",
    "role": "normal"
  }
]
```

**错误：**
- `403` — 非管理员用户尝试访问

---

### GET `/auth/users/{user_id}` — 获取用户详情

获取指定用户的信息。需要管理员权限。

**路径参数：** `user_id` — 用户 ID

**响应 `200`：** 单个用户对象（同列表中的结构）

---

### PATCH `/auth/users/{user_id}` — 管理员修改用户信息

修改指定用户的用户名、邮箱或密码。需要管理员权限。

**请求体：** 只需传递要修改的字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | `string` | 否 | 新用户名 |
| `email` | `string` | 否 | 新邮箱 |
| `password` | `string` | 否 | 新密码 |

**约束：**
- 超级管理员（`super_admin`）的信息仅可由本人修改
- 非超级管理员用户可以由其他管理员修改

**响应 `200`：** 更新后的用户对象

---

### PUT `/auth/users/{user_id}/role` — 修改用户角色

修改指定用户的角色。需要管理员权限。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `role` | `string` | 是 | 新角色：`normal` / `admin` / `super_admin` |

**约束：**
- 不能修改超级管理员的角色
- 普通管理员不能将自己提升为超级管理员（需通过数据库直接修改）

**响应 `200`：** 更新后的用户对象

---

### PATCH `/auth/me` — 修改个人信息

当前用户修改自己的用户名、邮箱或密码。

**请求体：** 同 PATCH `/auth/users/{user_id}`

**响应 `200`：** 更新后的用户对象

---

## 提示词管理

提示词管理接口需要管理员权限（`admin` 或 `super_admin` 角色）。

### GET `/prompts` — 提示词列表

获取所有提示词模板。

**响应 `200`：**

```json
[
  {
    "key": "story.system.base",
    "title": "故事生成系统提示",
    "category": "story",
    "description": "拼接到每次故事生成 system 消息开头的全局导演规则。",
    "content": "你是双人小说的导演型创作 AI...",
    "created_at": "2026-05-12T00:00:00+00:00",
    "updated_at": "2026-05-12T00:00:00+00:00"
  }
]
```

---

### GET `/prompts/{key}` — 获取单个提示词

**路径参数：** `key` — 提示词键名（如 `story.system.base`）

**响应 `200`：** 单个提示词对象

---

### PUT `/prompts/{key}` — 全量替换提示词

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | 否 | 标题（最多 128 字符） |
| `category` | `string` | 否 | 分类（最多 64 字符） |
| `description` | `string` | 否 | 描述 |
| `content` | `string` | 否 | 提示词内容 |

**说明：** 更新后会自动重载提示词缓存。

---

### PATCH `/prompts/{key}` — 部分更新提示词

仅传递要更新的字段。

---

### POST `/prompts/reload` — 重载提示词缓存

手动触发提示词缓存重新加载。返回所有提示词列表。

---

## 角色管理

所有接口需 `X-User-Id` 头。仅返回当前用户自己的角色数据。

### GET `/roles` — 角色列表

返回当前用户的所有角色。

**响应 `200`：**

```json
[
  {
    "id": 1,
    "spec": "",
    "name": "角色名",
    "description": "描述",
    "personality": "性格",
    "first_mes": "首条消息",
    "avatar": "",
    "mes_example": "对话示例",
    "scenario": "场景",
    "creator_notes": "备注",
    "system_prompt": "系统提示",
    "post_history_instructions": "历史指令",
    "alternate_greetings": [],
    "tags": []
  }
]
```

### POST `/roles` — 创建角色

创建新角色。请求体包含角色所有字段（不含 `id`）。

### GET/PUT/PATCH/DELETE `/roles/{id}`

标准 CRUD 操作。

---

## 预设管理

标准 CRUD，路径 `/presets`。仅返回当前用户自己的预设数据。

### 预设字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `temperature` | `float` | `0.75` | 温度参数 |
| `frequency_penalty` | `float` | `0.8` | 频率惩罚 |
| `presence_penalty` | `float` | `0.8` | 存在惩罚 |
| `top_p` | `float` | `0.99` | Top-p |
| `top_k` | `int` | `75` | Top-k |
| `top_a` | `int` | `0` | Top-a |
| `min_p` | `float` | `0.1` | Min-p |
| `repetition_penalty` | `float` | `1.1` | 重复惩罚 |
| `names_in_completion` | `bool` | `true` | 补全含角色名 |
| `main_prompt` | `string` | `""` | 主提示词 |
| `impersonation_prompt` | `string` | `""` | 扮演提示词 |
| `assistant_prefill` | `string` | `""` | 助手预填 |
| `jailbreak_prompt` | `string` | `""` | 补充提示词 |

---

## 条目管理

标准 CRUD，路径 `/entries`。仅返回当前用户自己的条目数据。

### GET/POST `/entries`

### GET/PUT/PATCH/DELETE `/entries/{id}`

### 条目字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `uid` | `int` | `0` | 条目 UID |
| `key` | `string[]` | `[]` | 主要关键词 |
| `keysecondary` | `string[]` | `[]` | 次要关键词 |
| `comment` | `string` | `""` | 备注 |
| `content` | `string` | `""` | 内容 |
| `order` | `int` | `100` | 排序 |

---

## 世界书管理

标准 CRUD，路径 `/lorebooks`。仅返回当前用户自己的世界书数据。

### 世界书字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | `string` | `""` | 名称 |
| `description` | `string` | `""` | 描述 |
| `scan_depth` | `int` | `50` | 扫描深度 |
| `token_budget` | `int` | `500` | Token 预算 |
| `entries` | `object` | `{}` | 条目集合 |

### 世界书条目子资源

世界书内的条目支持独立 CRUD。

#### `GET /lorebooks/{lorebook_id}/entries`

获取世界书的所有条目列表。

#### `GET /lorebooks/{lorebook_id}/entries/{entry_id}`

获取世界书内的单个条目。

#### `POST /lorebooks/{lorebook_id}/entries`

在世界书中创建新条目。请求体同条目创建。

#### `PUT /lorebooks/{lorebook_id}/entries/{entry_id}`

全量替换世界书内的条目。

#### `PATCH /lorebooks/{lorebook_id}/entries/{entry_id}`

部分更新世界书内的条目。

#### `DELETE /lorebooks/{lorebook_id}/entries/{entry_id}`

删除世界书内的条目。

---

## 故事管理

### GET `/stories` — 故事列表

**说明：** 返回的故事对象中 `round` 字段自动包含所有轮次数据。仅返回当前用户自己的故事。

### POST `/stories` — 创建故事

**请求体示例：**

```json
{
  "title": "新故事",
  "description": "故事描述",
  "status": "active",
  "url": "https://api.deepseek.com",
  "api_key": "sk-xxx",
  "model": "deepseek-v4-flash",
  "tags": ["奇幻"],
  "initial_scene": "初始场景描述",
  "role1": { "name": "角色1", "description": "..." },
  "role2": { "name": "角色2", "description": "..." },
  "preset": { "temperature": 0.75 },
  "lorebook": { "name": "世界书", "entries": {} }
}
```

### GET/PUT/PATCH/DELETE `/stories/{id}`

标准 CRUD。

**响应中故事结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `int` | 故事 ID |
| `title` | `string` | 标题 |
| `description` | `string` | 描述 |
| `status` | `string` | `active` / `completed` |
| `url` | `string` | LLM API URL |
| `api_key` | `string` | API Key |
| `model` | `string` | 模型名称 |
| `tags` | `string[]` | 标签 |
| `preset` | `object` | 预设配置 |
| `lorebook` | `object` | 世界书配置 |
| `initial_scene` | `string` | 初始场景 |
| `role1` | `object` | 角色1 |
| `role2` | `object` | 角色2 |
| `round` | `array` | 轮次列表 |
| `created_at` | `string` | 创建时间（ISO 8601） |
| `updated_at` | `string` | 更新时间（ISO 8601） |

---

## 故事轮次管理

故事轮次是 `stories` 的子资源，路径为 `/stories/{story_id}/rounds`。

### GET `/stories/{story_id}/rounds` — 轮次列表

返回指定故事的所有轮次（按 position, id 排序）。

### GET `/stories/{story_id}/rounds/{round_id}` — 获取单个轮次

### POST `/stories/{story_id}/rounds` — 创建轮次

手动创建新轮次。

**请求体：**

```json
{
  "scene": "场景描述",
  "narration": "旁白",
  "first": "role1",
  "role1_action": "",
  "role1_dialogue": "",
  "role2_action": "",
  "role2_dialogue": ""
}
```

### PUT `/stories/{story_id}/rounds/{round_id}` — 全量替换轮次

### PATCH `/stories/{story_id}/rounds/{round_id}` — 部分更新轮次

常用于编辑轮次的 `next_scene` 和 `next_narration`。

### DELETE `/stories/{story_id}/rounds/{round_id}` — 删除轮次

---

## 故事生成

AI 驱动的故事内容生成接口。

### POST `/stories/{story_id}/generate-opening` — 生成开场

根据故事的两个角色、初始场景和世界书，让 AI 生成开场场景、旁白和起始角色。

**触发条件：** 故事必须已设置 role1 和 role2（均需有 name）。

**响应 `200`：**

```json
{
  "scene": "生成的场景描述",
  "narration": "生成的旁白",
  "first": "role1"
}
```

**说明：** 此接口仅生成内容预览，不会自动创建轮次。需要前端调用 `POST /stories/{id}/rounds` 将生成的轮次保存。

**错误：**
- `400` — 故事未设置两个角色
- `502` — LLM 调用失败

---

### POST `/stories/{story_id}/generate-round` — 生成下一轮

自动生成下一轮对话内容。业务逻辑：

1. **首次调用（无轮次）：** 先自动生成开场场景并创建第一轮
2. **已有轮次但最后一轮空（无角色输出）：** 填充最后一轮的角色行动
3. **正常情况：** 创建新轮次，生成两个角色的 action/dialogue，以及下一轮的 scene/narration

**输出结构（新轮次）：**

```json
{
  "id": 2,
  "scene": "当前场景",
  "narration": "当前旁白",
  "first": "role1",
  "next_scene": "下一轮场景",
  "next_narration": "下一轮旁白",
  "next_first": "role2",
  "role1_action": "角色1动作",
  "role1_dialogue": "角色1台词",
  "role1_output": "角色1动作和台词合并且格式化",
  "role2_action": "角色2动作",
  "role2_dialogue": "角色2台词",
  "role2_output": "角色2动作和台词合并且格式化"
}
```

**说明：** 此接口会自动创建或更新轮次，前端无需额外保存操作。

**错误：**
- `400` — 故事未设置两个角色
- `502` — LLM 调用失败

---

## 接口总表

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| `GET` | `/health` | 健康检查 | 公开 |
| `POST` | `/auth/register` | 用户注册 | 公开 |
| `POST` | `/auth/login` | 用户登录 | 公开 |
| `GET` | `/auth/users` | 用户列表 | admin |
| `GET` | `/auth/users/{id}` | 获取用户 | admin |
| `PATCH` | `/auth/users/{id}` | 修改用户信息 | admin |
| `PUT` | `/auth/users/{id}/role` | 修改用户角色 | admin |
| `PATCH` | `/auth/me` | 修改个人信息 | 登录用户 |
| `GET` | `/prompts` | 提示词列表 | admin |
| `GET` | `/prompts/{key}` | 获取提示词 | admin |
| `PUT` | `/prompts/{key}` | 替换提示词 | admin |
| `PATCH` | `/prompts/{key}` | 更新提示词 | admin |
| `POST` | `/prompts/reload` | 重载提示词缓存 | admin |
| `GET` | `/roles` | 角色列表 | 登录用户 |
| `POST` | `/roles` | 创建角色 | 登录用户 |
| `GET` | `/roles/{id}` | 获取角色 | 登录用户 |
| `PUT` | `/roles/{id}` | 替换角色 | 登录用户 |
| `PATCH` | `/roles/{id}` | 更新角色 | 登录用户 |
| `DELETE` | `/roles/{id}` | 删除角色 | 登录用户 |
| `GET` | `/presets` | 预设列表 | 登录用户 |
| `POST` | `/presets` | 创建预设 | 登录用户 |
| `GET` | `/presets/{id}` | 获取预设 | 登录用户 |
| `PUT` | `/presets/{id}` | 替换预设 | 登录用户 |
| `PATCH` | `/presets/{id}` | 更新预设 | 登录用户 |
| `DELETE` | `/presets/{id}` | 删除预设 | 登录用户 |
| `GET` | `/entries` | 条目列表 | 登录用户 |
| `POST` | `/entries` | 创建条目 | 登录用户 |
| `GET` | `/entries/{id}` | 获取条目 | 登录用户 |
| `PUT` | `/entries/{id}` | 替换条目 | 登录用户 |
| `PATCH` | `/entries/{id}` | 更新条目 | 登录用户 |
| `DELETE` | `/entries/{id}` | 删除条目 | 登录用户 |
| `GET` | `/lorebooks` | 世界书列表 | 登录用户 |
| `POST` | `/lorebooks` | 创建世界书 | 登录用户 |
| `GET` | `/lorebooks/{id}` | 获取世界书 | 登录用户 |
| `PUT` | `/lorebooks/{id}` | 替换世界书 | 登录用户 |
| `PATCH` | `/lorebooks/{id}` | 更新世界书 | 登录用户 |
| `DELETE` | `/lorebooks/{id}` | 删除世界书 | 登录用户 |
| `GET` | `/lorebooks/{id}/entries` | 世界书条目列表 | 登录用户 |
| `GET` | `/lorebooks/{id}/entries/{eid}` | 获取世界书条目 | 登录用户 |
| `POST` | `/lorebooks/{id}/entries` | 创建世界书条目 | 登录用户 |
| `PUT` | `/lorebooks/{id}/entries/{eid}` | 替换世界书条目 | 登录用户 |
| `PATCH` | `/lorebooks/{id}/entries/{eid}` | 更新世界书条目 | 登录用户 |
| `DELETE` | `/lorebooks/{id}/entries/{eid}` | 删除世界书条目 | 登录用户 |
| `GET` | `/stories` | 故事列表 | 登录用户 |
| `POST` | `/stories` | 创建故事 | 登录用户 |
| `GET` | `/stories/{id}` | 获取故事 | 登录用户 |
| `PUT` | `/stories/{id}` | 替换故事 | 登录用户 |
| `PATCH` | `/stories/{id}` | 更新故事 | 登录用户 |
| `DELETE` | `/stories/{id}` | 删除故事 | 登录用户 |
| `GET` | `/stories/{id}/rounds` | 轮次列表 | 登录用户 |
| `GET` | `/stories/{id}/rounds/{rid}` | 获取轮次 | 登录用户 |
| `POST` | `/stories/{id}/rounds` | 创建轮次 | 登录用户 |
| `PUT` | `/stories/{id}/rounds/{rid}` | 替换轮次 | 登录用户 |
| `PATCH` | `/stories/{id}/rounds/{rid}` | 更新轮次 | 登录用户 |
| `DELETE` | `/stories/{id}/rounds/{rid}` | 删除轮次 | 登录用户 |
| `POST` | `/stories/{id}/generate-opening` | 生成开场 | 登录用户 |
| `POST` | `/stories/{id}/generate-round` | 生成下一轮 | 登录用户 |
