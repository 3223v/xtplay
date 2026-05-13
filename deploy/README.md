
# 项目部署文档

本文档描述了 xtplay 项目的完整部署流程。

## 目录

- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [后端部署](#后端部署)
- [前端部署](#前端部署)
  - [Vue 前端部署](#vue-前端部署)
  - [Next.js 前端部署](#nextjs-前端部署)
- [Docker 部署](#docker-部署)
- [常见问题](#常见问题)

## 项目结构

```
xtplay_separation/
├── xtplay_b/          # FastAPI 后端
├── xtplay_v/          # Vue 前端
├── xtplay_f/          # Next.js 前端
├── xtplay_doc/        # 项目文档
└── deploy/            # 部署文档和脚本
```

## 环境要求

### 系统要求

- 操作系统：Windows 10+、macOS 10.15+ 或 Linux (Ubuntu 20.04+)
- 内存：至少 4GB RAM (推荐 8GB+)
- 磁盘：至少 5GB 可用空间

### 软件依赖

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Docker &amp; Docker Compose (可选，用于容器化部署)

## 后端部署

### 1. 安装依赖

```bash
cd xtplay_b
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. 环境配置

复制 `.env.example` 为 `.env` 并配置数据库连接：

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少配置数据库连接：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/xtplay
# 或者
XTPLAY_DATABASE_URL=postgresql://user:password@localhost:5432/xtplay
```

### 3. 数据库准备

确保 PostgreSQL 服务已启动，然后创建数据库：

```sql
CREATE DATABASE xtplay;
```

数据库表会在应用启动时自动创建。

### 4. 启动开发服务器

```bash
# 使用 uvicorn 直接运行
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 或者使用其他方式
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API 文档地址：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 5. 生产部署

使用 gunicorn + uvicorn workers 进行生产部署：

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

## 前端部署

### Vue 前端部署

#### 1. 安装依赖

```bash
cd xtplay_v
npm install
```

#### 2. 配置环境

查看项目中的 `.env` 或配置文件，确保 API 地址正确配置。

#### 3. 开发模式运行

```bash
npm run dev
```

#### 4. 生产构建

```bash
npm run build
```

构建产物在 `dist` 目录中，可以部署到 Nginx、Apache 或其他静态文件服务器。

### Next.js 前端部署

#### 1. 安装依赖

```bash
cd xtplay_f
npm install
```

#### 2. 开发模式运行

```bash
npm run dev
```

#### 3. 生产构建和启动

```bash
npm run build
npm start
```

## Docker 部署

项目提供了 Docker 支持，快速部署。

### 使用 Docker Compose 部署所有服务

在项目根目录创建 `docker-compose.yml`（如未提供）：

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: xtplay
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: root
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  backend:
    build: ./xtplay_b
    environment:
      DATABASE_URL: postgresql://postgres:root@db:5432/xtplay
    ports:
      - "8000:8000"
    depends_on:
      - db
    restart: unless-stopped

  frontend_vue:
    build: ./xtplay_v
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  frontend_next:
    build: ./xtplay_f
    ports:
      - "3001:3000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

启动所有服务：

```bash
docker-compose up -d
```

查看服务状态：

```bash
docker-compose ps
```

## 常见问题

1. **数据库连接失败**
   - 检查 PostgreSQL 服务是否正常运行
   - 确认连接字符串是否正确
   - 查看防火墙设置

2. **前端无法连接后端**
   - 确认后端服务已启动
   - 检查前端配置的 API 地址
   - 确认 CORS 配置（后端已允许所有源）

3. **内存不足**
   - 减少 Docker 容器的内存限制
   - 优化数据库配置
   - 使用轻量级部署方案

