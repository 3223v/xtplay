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
  {
    id: "nextgen",
    title: "下一代架构畅想",
    summary: "从被动请求到主动感知，智能体异步反应架构，让模拟世界真正\"活\"起来。",
    content: (
      <div className="space-y-6">
        <div className="rounded-xl bg-[#f8fafc]/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-3">一、当前架构回顾</h3>
          <div className="space-y-4 text-sm leading-7 text-[#475569]">
            <p className="font-medium text-[#3b82f6]">1.1 现有的"请求-响应"模式</p>
            <p>当前的 XTPlay 架构采用经典的"用户驱动"模式：用户动作 → 主动请求 → Saint 审批 → 执行反馈 → 用户等待</p>
            <p className="font-medium text-[#3b82f6]">特点：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>用户通过 UI 主动发起每个操作</li>
              <li>智能体被动响应用户指令</li>
              <li>Saint 作为中介协调者存在</li>
              <li>回合制执行，节奏由用户控制</li>
            </ul>
            <p className="font-medium text-[#3b82f6]">局限：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>体验割裂 - 用户需要不断"推动"世界前进</li>
              <li>智能体缺乏主动性 - 它们只是执行者，不是"参与者"</li>
              <li>世界变化依赖人工触发 - 无法模拟真实的"事件驱动"世界</li>
              <li>并发交互受限 - 同一时刻只有一个智能体活跃</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc]/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-3">二、下一代架构畅想</h3>
          <div className="space-y-4 text-sm leading-7 text-[#475569]">
            <p className="font-medium text-[#3b82f6]">2.1 核心理念：从"被动等待"到"主动感知"</p>
            <p>未来的多智能体模拟场景，应该是<b>一个活生生的世界</b>：每个智能体都是世界的"活跃公民"，它们自主感知环境变化、主动做出反应、相互影响与协作。</p>
            <p className="font-medium text-[#3b82f6]">关键转变：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>用户角色</b>：从"导演"变为"观察者"或"规则制定者"</li>
              <li><b>智能体角色</b>：从"演员"变为"主动参与者"</li>
              <li><b>世界运行</b>：从"回合制"变为"事件驱动+并行反应"</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc]/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-3">三、核心机制详解</h3>
          <div className="space-y-4 text-sm leading-7 text-[#475569]">
            <p className="font-medium text-[#3b82f6]">3.1 事件驱动架构</p>
            <p>所有智能体订阅感兴趣的事件，异步接收并主动做出反应。事件类型包括：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>StateChange</b> - 状态变化（角色状态、环境、资源）</li>
              <li><b>ActionExecuted</b> - 动作执行（角色动作、集体动作）</li>
              <li><b>Communication</b> - 通信（消息发送、提案提出）</li>
              <li><b>Vote</b> - 投票（投票开始、投票结束）</li>
              <li><b>Temporal</b> - 时间驱动（回合流逝、截止日期临近）</li>
            </ul>

            <p className="font-medium text-[#3b82f6]">3.2 异步反应系统</p>
            <p>反应模式包括：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>即时反应</b> - 感知到事件后立即响应（低延迟）</li>
              <li><b>延迟反应</b> - 收集更多信息后再响应（思考型）</li>
              <li><b>条件反应</b> - 仅在满足特定条件时响应</li>
              <li><b>忽略</b> - 判断为无关事件，不做响应</li>
            </ul>

            <p className="font-medium text-[#3b82f6]">3.3 主动决策循环</p>
            <p>每个智能体拥有自己的决策循环：感知 → 推理 → 规划 → 行动</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>Perception</b> - 接收事件 → 解析信息 → 更新认知</li>
              <li><b>Reasoning</b> - 分析局势 → 评估选项 → 生成意图</li>
              <li><b>Planning</b> - 制定计划 → 预测后果 → 准备行动</li>
              <li><b>Action</b> - 执行动作 → 发布事件 → 影响世界</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc]/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-3">四、用户角色转变</h3>
          <div className="space-y-4 text-sm leading-7 text-[#475569]">
            <p className="font-medium text-[#3b82f6]">4.1 从"导演"到"观察者/设定者"</p>
            <p><b>观察者模式</b>：用户设置初始条件 → 观察世界演化 → 必要时介入</p>

            <p className="font-medium text-[#3b82f6]">4.2 多层次干预</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>Level 0</b> - 完全放手：设置完成后完全由智能体自主运行</li>
              <li><b>Level 1</b> - 事件注入：用户可以随时注入新事件</li>
              <li><b>Level 2</b> - 参数调整：实时调整世界参数</li>
              <li><b>Level 3</b> - 规则干预：直接修改规则或状态</li>
              <li><b>Level 4</b> - 完全控制：回到当前的回合制模式</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc]/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-3">五、技术实现考量</h3>
          <div className="space-y-4 text-sm leading-7 text-[#475569]">
            <p className="font-medium text-[#3b82f6]">5.1 架构组件</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>Event Gateway</b> - 事件收集、广播、订阅管理</li>
              <li><b>World Engine</b> - 包含 Event Bus、Agent Runtime、State Manager</li>
              <li><b>LLM Client</b> - LLM 调用管理</li>
              <li><b>Memory Store</b> - 记忆存储</li>
              <li><b>Rule Engine</b> - 规则引擎</li>
            </ul>

            <p className="font-medium text-[#3b82f6]">5.2 关键设计决策</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>事件溯源</b> - 记录所有事件，支持回放和调试</li>
              <li><b>异步执行</b> - 智能体决策使用异步执行，不阻塞其他智能体</li>
              <li><b>冲突解决</b> - 优先级、时间戳、协商、Saint 仲裁</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc]/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-3">六、过渡策略</h3>
          <div className="space-y-4 text-sm leading-7 text-[#475569]">
            <p className="font-medium text-[#3b82f6]">渐进式演进四阶段：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>Phase 1</b> - 混合模式：保留回合制，新增事件注入功能</li>
              <li><b>Phase 2</b> - 异步反应：引入事件总线，智能体可异步反应</li>
              <li><b>Phase 3</b> - 自主运行：智能体可主动发起动作</li>
              <li><b>Phase 4</b> - 完全主动：完整的主动感知架构</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc]/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-3">七、总结</h3>
          <div className="space-y-4 text-sm leading-7 text-[#475569]">
            <p><b>核心价值</b>：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><b>更真实的模拟</b> - 接近真实世界的运作方式</li>
              <li><b>更少的干预</b> - 用户从繁重的导演工作中解放</li>
              <li><b>更多的涌现</b> - 意想不到的情节自然发生</li>
              <li><b>更深的沉浸</b> - 观察一个"活着"的世界演化</li>
            </ul>
            <p>最终，我们追求的是在<b>自主性</b>与<b>可控性</b>之间找到最佳平衡点，让 XTPlay 成为真正意义上的"智能体模拟实验平台"。</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function Docs() {
  return (
    <SectionPageShell
      activeNav="docs"
      sections={sections}
      codeTitle="参考结构"
    />
  );
}
