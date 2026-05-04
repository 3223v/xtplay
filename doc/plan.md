# 用户系统设计与实现计划

## 1. 需求分析

### 1.1 核心需求
- **用户认证**: 用户通过用户名或邮箱+密码登录系统
- **数据隔离**: 每个用户拥有独立的数据空间（config、market、ground）
- **访问控制**: 未登录用户可访问主页(`/`)和文档页面(`/docs`)，其他页面需要登录
- **注册限制**: 暂时不开放注册接口，用户数据预先配置在JSON文件中
- **简化设计**: 密码无需加密，直接存储明文；无管理员用户；无需测试和日志

### 1.2 数据隔离范围
| 数据类型 | 隔离方式 | 说明 |
|---------|---------|------|
| 用户配置 (config) | 按用户ID存储 | 每个用户独立的语言设置、预设配置等 |
| 市场数据 (market) | 按用户ID存储 | 每个用户独立的文章/商品数据 |
| 工作空间数据 (ground) | 按用户ID存储 | 每个用户独立的工作空间、角色、回合数据 |

---

## 2. JSON数据结构设计

### 2.1 用户数据结构

```json
{
  "id": "user_xxx",
  "username": "john_doe",
  "email": "john@example.com",
  "password_hash": "$2b$10$...",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 用户唯一标识，格式: `user_<uuid>` |
| username | string | 用户名，唯一 |
| email | string | 邮箱地址，唯一 |
| password_hash | string | bcrypt加密后的密码 |
| created_at | string | 创建时间(ISO8601) |
| updated_at | string | 更新时间(ISO8601) |

### 2.2 会话数据结构

```json
{
  "session_id": "sess_xxx",
  "user_id": "user_xxx",
  "expires_at": "2024-01-02T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 2.3 数据存储结构

```
app/api/data/
├── users/                    # 用户数据目录
│   ├── database.json         # 用户列表
│   └── user_xxx/             # 用户专属数据目录
│       ├── config.json       # 用户配置
│       ├── ground_1.json     # 用户工作空间1
│       ├── ground_2.json     # 用户工作空间2
│       └── market/           # 用户市场数据
│           └── database.json
└── sessions/                 # 会话数据目录
    └── database.json
```

---

## 3. 目录结构设计

```
app/
├── api/
│   ├── auth/
│   │   ├── login/           # 登录接口
│   │   │   └── route.ts
│   │   ├── logout/          # 登出接口
│   │   │   └── route.ts
│   │   └── verify/          # 验证接口(保留)
│   │       └── route.ts
│   ├── users/               # 用户管理接口(管理员用)
│   │   ├── route.ts
│   │   └── [userId]/
│   │       └── route.ts
│   ├── data/
│   │   ├── users/           # 用户数据存储
│   │   │   ├── database.json
│   │   │   └── [userId]/    # 用户隔离目录
│   │   │       ├── config.json
│   │   │       ├── ground_*.json
│   │   │       └── market/
│   │   │           └── database.json
│   │   └── sessions/        # 会话存储
│   │       └── database.json
│   └── ...
├── lib/
│   ├── auth/                # 认证工具
│   │   ├── storage.ts       # 用户/会话存储
│   │   ├── utils.ts         # 密码加密/验证
│   │   └── types.ts         # 类型定义
│   └── ...
├── components/
│   └── LoginPage.tsx        # 登录页面组件
├── middleware.ts            # 认证中间件(增强)
└── ...
```

---

## 4. API接口设计

### 4.1 认证接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 登录 | POST | `/api/auth/login` | 用户名/邮箱+密码登录 |
| 登出 | POST | `/api/auth/logout` | 销毁会话 |
| 验证 | GET | `/api/auth/verify` | 验证登录状态 |

#### 4.1.1 POST /api/auth/login

**请求体**:
```json
{
  "identifier": "john_doe",    # 用户名或邮箱
  "password": "password123"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_xxx",
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
}
```

**失败响应** (401):
```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

#### 4.1.2 POST /api/auth/logout

**成功响应** (200):
```json
{
  "success": true,
  "message": "登出成功"
}
```

#### 4.1.3 GET /api/auth/verify

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_xxx",
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
}
```

**失败响应** (401):
```json
{
  "success": false,
  "message": "未登录"
}
```

### 4.2 用户管理接口 (管理员)

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建用户 | POST | `/api/users` | 创建新用户 |
| 获取用户列表 | GET | `/api/users` | 获取所有用户 |
| 获取用户详情 | GET | `/api/users/[userId]` | 获取单个用户 |
| 更新用户 | PUT | `/api/users/[userId]` | 更新用户信息 |
| 删除用户 | DELETE | `/api/users/[userId]` | 删除用户及所有数据 |

---

## 5. 核心模块设计

### 5.1 认证中间件 (middleware.ts)

**功能**:
- 拦截所有页面请求
- 验证会话有效性
- 未登录用户重定向到登录页
- 将用户信息注入请求上下文

**流程**:
```
请求 → 检查session cookie → 验证session → 获取用户ID → 注入请求 → 继续处理
         ↓ 失败
    返回登录页面
```

### 5.2 用户存储模块 (lib/auth/storage.ts)

**核心方法**:
| 方法 | 功能 |
|------|------|
| `getUserById(id)` | 按ID获取用户 |
| `getUserByUsername(username)` | 按用户名获取用户 |
| `getUserByEmail(email)` | 按邮箱获取用户 |
| `createUser(user)` | 创建用户 |
| `updateUser(id, data)` | 更新用户 |
| `deleteUser(id)` | 删除用户 |
| `verifyPassword(plain, hash)` | 验证密码 |

### 5.3 会话管理模块

**核心方法**:
| 方法 | 功能 |
|------|------|
| `createSession(userId)` | 创建会话 |
| `getSession(sessionId)` | 获取会话 |
| `deleteSession(sessionId)` | 删除会话 |
| `cleanExpiredSessions()` | 清理过期会话 |

### 5.4 数据隔离适配器

**设计思路**: 在现有的storage模块中增加用户ID参数，所有数据读写操作都基于用户ID进行隔离。

**修改的存储模块**:
- `app/lib/sim/storage.ts` - ground数据存储
- `app/lib/market/storage.ts` - market数据存储
- `app/lib/config.ts` - 用户配置存储

---

## 6. 任务分解与进度规划

### 任务列表

| 序号 | 任务 | 描述 | 预估时间 | 依赖 |
|------|------|------|---------|------|
| 1 | 用户类型定义 | 定义User、Session等类型 | 0.5天 | - |
| 2 | 用户存储模块 | 实现用户CRUD和密码验证 | 1天 | 1 |
| 3 | 会话管理模块 | 实现会话创建、验证、销毁 | 1天 | 1 |
| 4 | 登录API | 实现登录接口 | 0.5天 | 2,3 |
| 5 | 登出API | 实现登出接口 | 0.5天 | 3 |
| 6 | 验证API | 更新验证接口 | 0.5天 | 3 |
| 7 | 用户管理API | 实现管理员用户管理接口 | 1天 | 2 |
| 8 | 登录页面 | 创建登录页面组件 | 1天 | - |
| 9 | 中间件增强 | 更新middleware实现完整认证 | 1天 | 3 |
| 10 | ground存储适配 | 修改ground存储支持用户隔离 | 1天 | 2 |
| 11 | market存储适配 | 修改market存储支持用户隔离 | 0.5天 | 2 |
| 12 | config存储适配 | 修改config存储支持用户隔离 | 0.5天 | 2 |
| 13 | 现有API适配 | 修改所有API支持用户上下文 | 1天 | 9,10,11,12 |
| 14 | 测试验证 | 登录、数据隔离测试 | 1天 | 所有 |

### 进度甘特图

```
阶段1: 基础架构 (3天)
├── 类型定义 ──────────────────────┐
├── 用户存储 ──────────────────────┤
└── 会话管理 ──────────────────────┘

阶段2: 认证接口 (2天)
├── 登录API ───────────────────────┐
├── 登出API ───────────────────────┤
├── 验证API ───────────────────────┤
└── 用户管理API ───────────────────┘

阶段3: 前端与中间件 (2天)
├── 登录页面 ──────────────────────┐
└── 认证中间件 ────────────────────┘

阶段4: 数据隔离适配 (3天)
├── ground存储适配 ────────────────┐
├── market存储适配 ────────────────┤
├── config存储适配 ────────────────┤
└── 现有API适配 ───────────────────┘

阶段5: 测试验证 (1天)
└── 功能测试 ──────────────────────┘

总计: 约11天
```

---

## 7. 安全性考虑

### 7.1 会话安全
- 使用UUID生成会话ID
- 设置合理的会话过期时间（24小时）
- 使用HttpOnly、Secure cookie

### 7.2 数据隔离
- 严格按用户ID隔离数据目录
- 禁止跨用户数据访问
- API层验证用户权限

### 7.3 输入验证
- 对所有输入进行参数验证

---

## 8. 注意事项

1. **用户数据配置**: 用户数据通过手动编辑JSON文件预先配置，无需注册接口
2. **环境变量**: 需要添加SESSION_SECRET等环境变量
3. **错误处理**: 统一错误消息格式，避免泄露敏感信息
4. **公开页面**: 主页(`/`)和文档页面(`/docs`)无需登录即可访问，其他页面需要登录
5. **现有数据**: 现有数据无需迁移，新用户创建时自动生成独立数据目录