# XTPlay - Multi-Character LLM Simulator

XTPlay 是一个多角色 LLM 模拟平台，允许用户创建和管理多个 AI 角色，模拟它们之间的交互和对话。

## 功能特性

### 🎭 多角色管理
- 创建和管理多个 AI 角色
- 自定义角色提示词、知识和状态
- 支持角色关系和限制设置

### 🔄 回合制执行
- 支持自动（Saint 模式）和手动两种推进方式
- 角色可以发送消息、投票和执行动作
- 完整的回合历史记录

### 📋 事件注入
- 支持自定义事件注入
- 预设事件模板（狼人杀、法庭审判等）
- 事件可以触发角色反应

### 📊 可视化工作区
- 基于 React Flow 的节点可视化
- 拖拽式角色管理
- 实时状态显示

### 📦 场景市场
- 可复用的场景模板
- 一键导入/导出 Ground 配置
- 社区共享场景

### 📱 响应式设计
- 明亮优雅的现代 UI
- 移动端适配
- 流畅的交互体验

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 3
- **可视化**: React Flow
- **数据校验**: Zod
- **状态管理**: React Hooks

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### 生产构建

```bash
npm run build
npm start
```

## 项目结构

```
xtplay/
├── app/                    # Next.js App Router
│   ├── components/         # 共享组件
│   ├── ground/             # 工作台页面
│   ├── manage/             # 管理页面
│   ├── docs/               # 文档页面
│   ├── market/             # 场景市场
│   ├── lib/                # 核心逻辑
│   │   ├── sim/            # 模拟核心
│   │   ├── config/         # 配置管理
│   │   └── market/         # 市场模块
│   └── api/                # API 路由
├── public/                 # 静态资源
└── doc/                   # 文档
```

## 核心概念

### Ground
Ground 是世界容器，包含：
- 规则和公共知识
- 角色列表
- 回合历史
- 模拟配置

### Role
Role 是单个 LLM 角色，包含：
- 提示词
- 知识
- 收件箱
- 关系限制
- 状态和运行痕迹

### Round
Round 是一次批次推进结果，包含：
- 消息记录
- 投票记录
- 事件记录
- 动作记录

### Saint
Saint 是可选的主持人角色，负责：
- 提出计划
- 裁决建议
- 需要用户审批才能执行

## 使用指南

### 1. 创建 Ground
访问 `/manage` 页面，点击 "Create Ground" 创建新的工作空间。

### 2. 添加角色
在工作台点击 "Add Role" 创建 AI 角色，设置角色名称、提示词和知识。

### 3. 推进回合
- **手动模式**: 点击 "Advance" 按钮推进回合
- **自动模式**: 添加 Saint 角色，AI 会自动生成计划

### 4. 注入事件
点击 "Inject Event" 添加自定义事件或选择预设事件。

### 5. 导出场景
点击右上角 "Export" 按钮，可导出到市场或复制 JSON 配置。

## 配置说明

配置文件位于 `app/api/data/config/config.json`:

```json
{
  "auth": {
    "enabled": false,
    "password": "1234"
  },
  "presets": {
    "urls": [{"value": "https://api.openai.com/v1", "label": "OpenAI"}],
    "models": [{"value": "gpt-4o", "label": "GPT-4o"}]
  },
  "events": [
    {"type": "night_falls", "title": "Night Falls", "description": "Night has fallen..."}
  ]
}
```

## 未来计划

- [ ] 引入分支，允许用户分叉世界模拟。
- [ ] 引入世界书和角色卡，增加可玩性。
- [ ] 引入Agent,让用户成为真正的世界上帝