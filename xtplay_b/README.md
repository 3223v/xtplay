## xtplay_b

`xtplay_b` 是基于 Python + FastAPI + PostgreSQL 的后端服务，提供双人小说 AI 创作的 API 支持。

### 数据存储

- **PostgreSQL**：所有数据持久化到数据库中
- 启动时自动建表（`init_db()`），包含 `users`、`roles`、`presets`、`entries`、`lorebooks`、`stories`、`story_rounds`、`prompts` 八张表
- 内置 `super_admin` 账号（用户名 `super_admin`，密码 `super_admin123`）
- 初始 `admin` 账号（用户名 `admin`，密码 `123456`，角色 `admin`）

### 目录说明

- `app/api/v1/router.py`：HTTP 路由定义
- `app/db/postgres_store.py`：PostgreSQL 数据访问层
- `app/model/`：Pydantic 请求/响应模型
- `app/services/`：业务逻辑（故事生成、提示词缓存）
- `app/utils/`：公共工具

### 启动

1. 确保 PostgreSQL 运行，创建数据库 `xtplay`
2. 配置环境变量（支持 `XTPLAY_DATABASE_URL`、`DATABASE_URL`、`POSTGRES_DSN`）
3. 安装依赖：`pip install -r requirements.txt`
4. 启动服务：`uvicorn app.main:app --reload`
5. 健康检查：访问 `GET /health`

### 默认连接

```
postgresql://postgres:root@localhost:5432/xtplay
```

可通过 `.env` 文件或环境变量覆盖。

### API 概览

**认证**
- `POST /api/v1/auth/register` — 注册
- `POST /api/v1/auth/login` — 登录
- `PATCH /api/v1/auth/me` — 修改个人信息
- `GET /api/v1/auth/users` — 用户列表（管理员）
- `PATCH /api/v1/auth/users/{id}` — 修改用户（管理员）
- `PUT /api/v1/auth/users/{id}/role` — 修改角色（管理员）

**实体 CRUD**（需 `X-User-Id` 头）
- `GET/POST /api/v1/roles`
- `GET/POST /api/v1/presets`
- `GET/POST /api/v1/entries`
- `GET/POST /api/v1/lorebooks`
- `GET/POST /api/v1/stories`

`PUT`、`PATCH`、`DELETE` 同样可用。世界书嵌套条目通过 `/api/v1/lorebooks/{id}/entries` 操作。

**提示词管理**（需管理员）
- `GET/PUT/PATCH /api/v1/prompts`

**故事生成**
- `POST /api/v1/stories/{id}/generate-opening` — 生成开场
- `POST /api/v1/stories/{id}/generate-round` — 生成下一轮
