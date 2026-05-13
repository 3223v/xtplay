# xtplay_v

双人小说 AI 创作平台的前端，基于 Vue 3 + TypeScript + Vite。

## 功能

- **宣传落地页**：持续下滑式 landing page，右上角登录/注册入口
- **用户认证**：登录 / 注册，支持角色权限（普通用户、管理员、超级管理员）
- **仪表盘**：快捷入口卡片，快速访问各管理模块
- **角色管理**：创建和管理 AI 角色，支持角色卡规范
- **预设配置**：模型生成参数调优（温度、Top-p、频率惩罚等）
- **条目管理**：世界书条目管理
- **世界书管理**：组织和嵌套条目
- **故事管理**：故事创建、角色关联、场景设置
- **阅读器**：沉浸式阅读界面，自动推进和场景轮转
- **提示词管理**（管理员）：系统提示词模板管理
- **用户管理**（管理员）：用户列表、角色分配
- **JSON 导入/导出**：每个实体的编辑面板支持下载 JSON、复制 JSON、从文件导入、粘贴 JSON

## 项目说明

```
src/
├── api/              # API 请求封装
├── components/       # 通用组件（AppLayout, CrudLayout, EditPanel, ImportExportMenu 等）
├── router/           # Vue Router 配置
├── stores/           # Pinia 状态管理
├── styles/           # 全局样式与设计 Token
├── types/            # TypeScript 类型定义
└── views/            # 页面视图
    └── manage/       # 管理后台各模块
```

## 启动

```sh
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

## 构建

```sh
npm run build
```

## 路由

| 路径 | 页面 | 权限 |
|------|------|------|
| `/` | 宣传落地页 | 公开 |
| `/dashboard` | 仪表盘 | 需登录 |
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/profile` | 个人信息 | 需登录 |
| `/manage/roles` | 角色管理 | 需登录 |
| `/manage/presets` | 预设管理 | 需登录 |
| `/manage/entries` | 条目管理 | 需登录 |
| `/manage/lorebooks` | 世界书管理 | 需登录 |
| `/manage/stories` | 故事管理 | 需登录 |
| `/manage/prompts` | 提示词管理 | 管理员 |
| `/manage/users` | 用户管理 | 管理员 |
| `/read` | 阅读器 | 需登录 |

## 导入/导出

所有实体编辑面板（角色、预设、条目、世界书、故事）均支持：

- **下载 JSON 文件**：将当前实体数据导出为 `.json` 文件
- **复制 JSON**：将当前实体数据复制到剪贴板
- **从文件导入**：读取本地 `.json` 文件创建新实体
- **粘贴 JSON**：粘贴 JSON 文本创建新实体

导入操作通过标准 CRUD POST 接口创建新实体，不会覆盖已有数据。
