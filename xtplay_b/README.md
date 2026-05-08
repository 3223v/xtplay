## xtplay_b

`xtplay_b` 是一个基于 Python + FastAPI 的 JSON 持久化后端，数据直接存放在 `data/` 目录下的四个集合文件中：`roles.json`、`presets.json`、`entries.json`、`lorebooks.json`。

### 目录说明

- `app/api/`：HTTP 路由
- `app/db/`：JSON 读写与归一化
- `app/model/`：Pydantic 请求/响应模型
- `app/utils/`：公共路径等工具
- `data_demo/`：示例数据结构参考

### 启动

1. 安装依赖：`pip install -r requirements.txt`
2. 启动服务：`uvicorn app.main:app --reload`
3. 健康检查：访问 `GET /health`

### API 概览

- `GET /api/v1/roles` / `POST /api/v1/roles`
- `GET /api/v1/presets` / `POST /api/v1/presets`
- `GET /api/v1/entries` / `POST /api/v1/entries`
- `GET /api/v1/lorebooks` / `POST /api/v1/lorebooks`
- `GET /api/v1/lorebooks/{id}/entries` / `POST /api/v1/lorebooks/{id}/entries`

`PATCH` 和 `DELETE` 同样可用，所有写入都会落盘到 `data/` 下对应 JSON 文件。
