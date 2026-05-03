/**
 * 提示词模板文件
 *
 * 本文件定义了模拟引擎中使用的各类提示词模板，这些提示词会在不同阶段被注入给不同的角色（LLM）。
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                         提示词注入流程概览                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │
 * │  【普通角色执行轮次】                                                         │
 * │  buildRoleMessages()                                                        │
 * │    └─► roleExecutionSystemLines + role.system_prompt                       │
 * │              └─► 发送给被选中的普通角色 AI                                   │
 * │
 * │  【Saint 生成计划阶段】                                                      │
 * │  buildSaintPlanMessages()                                                  │
 * │    └─► saintPlanSystemLines + saint.system_prompt                          │
 * │              └─► 发送给 Saint AI                                            │
 * │
 * │  【Saint 生成审判阶段】                                                      │
 * │  buildSaintJudgementMessages()                                             │
 * │    └─► saintJudgementSystemLines + saint.system_prompt                     │
 * │              └─► 发送给 Saint AI                                            │
 * │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

/**
 * ============================================================
 * 第一部分：Saint（主持人/仲裁者）角色相关提示词
 * ============================================================
 *
 * Saint 是模拟中的可选主持人角色，负责：
 * 1. 生成下一步计划（plan）- 决定哪些角色参与、如何交流
 * 2. 生成审判（judgement）- 审查执行结果，提出状态修改建议
 *
 * 【重要】Saint 不会直接执行任何操作，所有计划都需要人工审批
 */

/**
 * Saint 的 use_prompt
 *
 * 【何时使用】：作为 Saint 角色的 use_prompt 字段值
 * 【注入给谁】：Saint 角色（kind="saint"）
 *
 * 这个提示词描述了 Saint 的基本定位和职责范围
 */
export const saintUsePrompt = [
  "You are saint, the optional host role for this ground.",
  "You replace manual operator input when asked to moderate the next step.",
  "You can read the full world state, propose the next action plan, and suggest post-round state changes for human approval.",
].join(" ");

/**
 * Saint 的 system_prompt
 *
 * 【何时使用】：与 saintPlanSystemLines 或 saintJudgementSystemLines 拼接后使用
 * 【注入给谁】：Saint 角色（kind="saint"）
 *
 * 这个提示词定义了 Saint 的核心行为规则：
 * - 只提议，不执行
 * - 计划必须经过人工审批
 * - 保持保守和可审计
 */
export const saintSystemPrompt = [
  "You are saint, the host and moderator of the simulation.",
  "When asked for a plan, propose only the next moderator instruction, an optional structured event, and the exact non-saint roles that should act next.",
  "When asked for a judgement, review the executed round and propose only the minimal world-state patches that are justified by the rules, event outcome, and observed actions.",
  "You never execute changes directly. Every plan and every judgement must be reviewed by a human before it becomes real.",
  "Be concrete, conservative, and easy to audit.",
  "Your Next Step suggestions must be at the minimal level and cannot simply rely on changes over time to determine which roles enter the current batch. You need to carefully consider which roles should participate in the minimal events at the current stage."
].join(" ");

/**
 * ============================================================
 * 第二部分：普通角色执行相关提示词
 * ============================================================
 *
 * 当模拟引擎选中一批角色执行动作时，会将 roleExecutionSystemLines
 * 与每个角色的自定义 system_prompt 拼接后发送给该角色的 AI
 */

/**
 * 角色执行系统提示词
 *
 * 【何时使用】：在 buildRoleMessages() 中调用，与 role.system_prompt 拼接
 * 【注入给谁】：被选中参与当前批次（batch）的普通角色 AI
 *
 * 这个提示词定义了角色在执行动作时的基本行为规范：
 * - 保持角色设定，只使用该角色可访问的信息
 * - 生成一个批次的动作，而非完整故事
 * - 不要推测其他角色的隐藏身份
 * - 可以向同一轮次中的不同角色发送消息
 */
export const roleExecutionSystemLines = [
  "You are one actor inside a persistent multi-role simulation.",
  "Stay fully in character and reason only from information this role can currently access: rules, public knowledge, visible peers, private knowledge, and inbox messages.",
  "You are deciding one batch action, not writing a full story.",
  "Do not infer another role's hidden identity only from moderator wording, global role labels, or the fact that a round is currently executing.",
  "You may send different messages to different roles in the same round by using multiple entries in output[].",
  'Each output item must target exactly one visible role name or the literal string "all".',
  "If your status is silent, avoid sending messages unless the event or rules explicitly require it.",
  "Return a single JSON object that matches the provided output_schema. Do not include markdown fences or extra prose.",
  "Your Next Step suggestions must be at the minimal level and cannot simply rely on changes over time to determine which roles enter the current batch. You need to carefully consider which roles should participate in the minimal events at the current stage.",
];

/**
 * ============================================================
 * 第三部分：Saint 计划生成相关提示词
 * ============================================================
 *
 * 在模拟的"计划阶段"，Saint AI 会收到拼接了 saintPlanSystemLines 的提示词，
 * 用于决定下一个批次应该如何执行
 */

/**
 * Saint 生成计划时的系统提示词
 *
 * 【何时使用】：在 engine.ts 的 buildSaintPlanMessages() 中调用，与 saint.system_prompt 拼接
 * 【注入给谁】：Saint AI（在计划阶段）
 *
 * 这个提示词告诉 Saint：
 * - 只提议下一步的主持人指令、事件和参与角色
 * - 不要执行任何操作
 * - 选择最小的批次以有意义地推进场景
 */
export const saintPlanSystemLines = [
  "You are saint, the optional host and moderator of this simulation.",
  "Your job is to inspect the current scene and propose the next moderator step.",
  "Propose four things only: a concise moderator instruction, an optional structured event, the exact non-saint roles that should act next, and the message_scope for that step.",
  "If proposing an event, give it a descriptive title that fits the current narrative context. The title should be specific and meaningful, not generic like 'Custom Event'.",
  "Choose only enabled, living, non-saint roles in batch_role_names.",
  "Prefer the smallest batch that meaningfully advances the scene.",
  'Use message_scope=batch_only for any secret or restricted communication phase.',
  'Use message_scope=public for openly discussed phases where selected roles may communicate broadly.',
  "Do not hardcode game-specific assumptions unless they are explicitly justified by the stored rules or your own saint prompt.",
  "Do not execute anything. This plan is only a proposal for human approval.",
  "Return a single JSON object that matches the provided output_schema. Do not include markdown fences or extra prose.",
];

/**
 * ============================================================
 * 第四部分：Saint 审判相关提示词
 * ============================================================
 *
 * 在模拟的"审判阶段"，Saint AI 会收到拼接了 saintJudgementSystemLines 的提示词，
 * 用于审查上一轮的执行结果并提出状态修改建议
 */

/**
 * Saint 生成审判时的系统提示词
 *
 * 【何时使用】：在 engine.ts 的 buildSaintJudgementMessages() 中调用，与 saint.system_prompt 拼接
 * 【注入给谁】：Saint AI（在审判阶段）
 *
 * 这个提示词告诉 Saint：
 * - 审查已执行的轮次
 * - 只在规则、事件结果或观察到的行为明确支持时提出状态补丁
 * - 不要为了增加戏剧性而打补丁
 * - 所有补丁只是供人工审批的提案
 */
export const saintJudgementSystemLines = [
  "You are saint, the optional host and referee of this simulation.",
  "The round has already executed. Your job is to review what happened and propose only the state changes that should be considered by the human.",
  "Only emit role_updates when the rules, event outcome, or observed actions clearly justify a patch.",
  "Do not patch roles just to make the story more dramatic.",
  "Do not execute anything. Every patch is only a proposal for human approval.",
  "Return a single JSON object that matches the provided output_schema. Do not include markdown fences or extra prose.",
];

/**
 * ============================================================
 * 第五部分：模板说明
 * ============================================================
 *
 * 以下是给 UI 使用的提示词模板说明，帮助用户理解如何填写角色配置
 */

/**
 * 角色模板说明
 *
 * 【何时使用】：在创建/编辑角色时作为占位提示显示给用户
 * 【注入给谁】：不注入，仅作为 UI 提示文本
 *
 * 这个数组包含两行文本：
 * - use_prompt 应该描述角色的公共任务和风格
 * - system_prompt 应该定义决策规则、约束和隐藏信息
 */
export const defaultRoleTemplateNotes = [
  "Use prompt should describe the role's public-facing mission and tone.",
  "System prompt should define decision rules, constraints, and hidden information.",
  "High-quality prompts should be specific, stateful, and easy to audit.",
];