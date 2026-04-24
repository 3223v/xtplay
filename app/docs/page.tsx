"use client";

import {
  SectionPageItem,
  SectionPageShell,
} from "@/app/components/section-page-shell";

const sections: SectionPageItem[] = [
  {
    id: "overview",
    title: "总体结构",
    summary: "XTPlay 以 Ground 为根节点，把角色、回合、工作流和持久化状态组织在同一份模型里。",
    blocks: [
      "Ground 是世界容器，保存规则、公共知识、角色列表、回合历史、模拟配置和 saint 审批状态。",
      "Role 是单个 LLM 角色，包含提示词、知识、收件箱、关系限制、状态和运行痕迹。",
      "Round 是一次批次推进结果，保存消息、投票、事件、动作记录和前后快照。",
      "saint 是可选主持人，只负责提出计划和裁决建议，真正执行仍然需要用户审批。",
    ],
    code: `Ground
├─ metadata
├─ rule / knowledge
├─ role[]
├─ round[]
├─ simulation
└─ workflow
   ├─ pending_plan
   └─ pending_judgement`,
  },
  {
    id: "frontend",
    title: "前端界面",
    summary: "当前前端主要有三个工作界面：管理页、Ground 工作台、内容页。",
    blocks: [
      "Manage 页面负责 Ground 列表、创建、编辑、删除和导入。",
      "Ground 页面是主工作台，支持角色拖拽、角色编辑、回合推进和 saint 审批。",
      "Docs 页面承载技术架构说明，Market 页面承载可直接导入的场景模板。",
      "Ground 页中的核心操作会回写后端 JSON 层，而不是只停留在本地 React 状态里。",
    ],
    code: `/manage  -> Ground 管理
/ground  -> 角色画布、回合执行、saint 审批
/docs    -> 技术架构文档
/market  -> 场景模板与导入入口`,
  },
  {
    id: "domain",
    title: "领域模型",
    summary: "核心模型定义在 app/lib/sim/types.ts，由 Zod 做校验和归一化。",
    blocks: [
      "Role 状态统一为 active、silent、dead。",
      "Role 还包含 redundancy、blocked_role_names、unknown_role_names、inbox 等运行字段。",
      "Workflow 用于保存 saint 的两阶段审批结果：pending_plan 和 pending_judgement。",
      "Round event 当前内建 custom 与 death_vote 两种模板。",
    ],
    code: `role: {
  id, kind, name,
  use_prompt, system_prompt,
  knowledge_private, knowledge_public,
  blocked_role_names, unknown_role_names,
  inbox, redundancy, status, enabled
}

workflow: {
  pending_plan,
  pending_judgement
}`,
  },
  {
    id: "prompting",
    title: "提示词体系",
    summary: "提示词分成项目内建系统提示词和角色自身提示词两层。",
    blocks: [
      "项目内建提示词放在 app/lib/sim/prompts.ts，用于普通角色执行、saint 计划提议、saint 裁决提议。",
      "角色自己的 use_prompt 和 system_prompt 负责身份设定、隐藏信息和行为边界。",
      "真正发给模型的内容由 engine.ts 组装，会注入规则、可见角色、收件箱、历史轮次和结构化输出 schema。",
      "当前提示词已经明确支持一轮内向不同对象发送不同消息，只要在 output[] 中写多个条目即可。",
    ],
    code: `prompts.ts
├─ roleExecutionSystemLines
├─ saintPlanSystemLines
└─ saintJudgementSystemLines

engine.ts
├─ buildRoleMessages()
├─ buildSaintPlanMessages()
└─ buildSaintJudgementMessages()`,
  },
  {
    id: "saint",
    title: "Saint 审批流",
    summary: "saint 是主持人，不是自动执行器。",
    blocks: [
      "第一阶段：saint 查看当前局面，提出下一步主持指令、可选事件和应参与推进的角色名单。",
      "用户审批通过后，系统才真正执行这一轮。",
      "第二阶段：saint 查看已执行回合，提出状态变更或属性补丁。",
      "用户再次审批通过后，这些补丁才真正写入角色状态。",
    ],
    code: `POST /api/saint?action=propose_plan
  -> workflow.pending_plan

POST /api/saint?action=approve_plan
  -> 执行回合
  -> workflow.pending_judgement

POST /api/saint?action=approve_judgement
  -> 应用 role_updates`,
  },
  {
    id: "runtime",
    title: "回合执行链路",
    summary: "计划一旦被批准，系统只执行被选中的非 saint 角色。",
    blocks: [
      "每个角色执行前会收到结构化上下文：规则、知识、收件箱、可见角色、最近回合和输出 schema。",
      "角色输出知识变更、消息、投票、状态更新和冗余字段修改。",
      "消息会经过可见性和投递限制过滤，再写入收件箱。",
      "投票会按当前可见对象清洗后写入 round 记录中。",
    ],
    code: `批准 saint 计划
-> advanceGroundRound()
-> 批量执行普通角色
-> 投递消息 / 清洗投票
-> 写入 round
-> saint 提出 judgement`,
  },
  {
    id: "persistence",
    title: "持久化与缓存",
    summary: "项目当前使用 JSON 文件作为主存储，并配套进程内缓存。",
    blocks: [
      "Ground 数据存放在 app/api/data/ground_<id>.json。",
      "readGroundData() 会读取文件、归一化旧数据、必要时重写文件，并更新缓存。",
      "listGroundSummaries() 走轻量 summary 路径，只读取列表所需字段。",
      "Ground 页面中的显式操作已经会回写到后端 JSON 层。",
    ],
    code: `storage.ts
├─ ground cache
├─ summary cache
├─ readGroundData()
├─ writeGroundData()
└─ listGroundSummaries()`,
  },
  {
    id: "api",
    title: "API 约定",
    summary: "接口围绕 Ground、Role、Round、Saint 四类资源组织。",
    blocks: [
      "Ground 接口负责列表、详情、创建、更新、删除和导入。",
      "Role 接口负责 Ground 内角色的增删改查。",
      "Round 接口负责执行回合并保存历史。",
      "Saint 接口负责主持人计划和裁决审批流，saint/toggle 负责添加或移除 saint。",
    ],
    code: `GET    /api/ground
GET    /api/ground?id={id}
POST   /api/ground
PUT    /api/ground
DELETE /api/ground?id={id}
POST   /api/ground/import

GET    /api/role?groundId={id}
POST   /api/role?groundId={id}
PUT    /api/role?groundId={id}
DELETE /api/role?groundId={id}&id={roleId}

GET    /api/round?groundId={id}
POST   /api/round?groundId={id}

POST   /api/saint?groundId={id}
POST   /api/saint/toggle?groundId={id}`,
  },
];

export default function Docs() {
  return (
    <SectionPageShell
      heroEyebrow="XTPlay 技术架构"
      heroTitle="Ground、Role、Saint、回合执行与 JSON 持久层是怎样连起来的"
      heroDescription="这页只描述当前代码真正运行的结构，不写宣传语，不写概念外延，方便你直接对照实现和接口理解项目。"
      activeNav="docs"
      footerLabel="© 2026 XTPlay · 技术文档"
      sections={sections}
      codeTitle="参考结构"
    />
  );
}
