import OpenAI from "openai";

import {
  buildRoundEventDraft,
  createGroundSnapshot,
  createInboxEntry,
  getBatchRoles,
  getSaintRole,
  GroundFile,
  isSaintRole,
  RoleAction,
  RoleActionRecord,
  RoleConfig,
  RoleMessage,
  RoleOutboundMessage,
  RoleVote,
  RoundEvent,
  SaintJudgement,
  saintJudgementSchema,
  SaintPlan,
  saintPlanSchema,
  roundEventSchema,
  roundSchema,
  roleActionRecordSchema,
  roleActionSchema,
  saintActionSchema,
  SaintAction,
  SaintRolePatch,
  uniqueTextList,
} from "./types";
import { getLanguageConfig } from "@/app/lib/config";
import { getPrompts, Language } from "./prompts";

interface AdvanceRoundOptions {
  instructions?: string;
  event?: RoundEvent | null;
  batchRoleIds?: string[];
  excludedRoleIds?: string[];
  messageScope?: "public" | "batch_only";
  dryRun?: boolean;
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return trimmed;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function normalizeEvent(event?: RoundEvent | null) {
  if (!event) {
    return null;
  }

  const parsed = roundEventSchema.parse(event);
  return buildRoundEventDraft(parsed.type, parsed.prompt, parsed.title);
}

function getExcludedSet(excludedRoleIds?: string[]) {
  return new Set(excludedRoleIds ?? []);
}

function getVisibleRolesForRole(ground: GroundFile, viewer: RoleConfig) {
  return ground.role.filter(
    (candidate) =>
      candidate.id !== viewer.id &&
      !viewer.unknown_role_names.includes(candidate.name),
  );
}

function canDeliverMessage(sender: RoleConfig, receiver: RoleConfig, bypassRestrictions = false) {
  if (receiver.id === sender.id || receiver.status === "dead") {
    return false;
  }

  if (bypassRestrictions) {
    return true;
  }

  if (sender.status === "silent") {
    return false;
  }

  if (sender.blocked_role_names.includes(receiver.name)) {
    return false;
  }

  if (sender.unknown_role_names.includes(receiver.name)) {
    return false;
  }

  if (receiver.unknown_role_names.includes(sender.name)) {
    return false;
  }

  return true;
}

function resolveRecipients(
  ground: GroundFile,
  sender: RoleConfig,
  targetName: string,
  bypassRestrictions = false,
  allowedTargetNames?: Set<string>,
) {
  if (targetName === "all") {
    return ground.role.filter((candidate) => {
      if (allowedTargetNames && !allowedTargetNames.has(candidate.name)) {
        return false;
      }

      return canDeliverMessage(sender, candidate, bypassRestrictions);
    });
  }

  const candidate = ground.role.find((role) => role.name === targetName);

  if (allowedTargetNames && (!candidate || !allowedTargetNames.has(candidate.name))) {
    return [];
  }

  if (!candidate || !canDeliverMessage(sender, candidate, bypassRestrictions)) {
    return [];
  }

  return [candidate];
}

function sanitizeVotes(
  ground: GroundFile,
  sender: RoleConfig,
  votes: RoleAction["vote"],
) {
  const visibleTargets = ground.role.filter(
    (candidate) =>
      candidate.id !== sender.id &&
      candidate.kind !== "saint" &&
      candidate.status !== "dead" &&
      !sender.unknown_role_names.includes(candidate.name),
  );

  return votes.flatMap((vote) => {
    const target = visibleTargets.find((candidate) => candidate.name === vote.role);

    if (!target) {
      return [];
    }

    return [
      {
        ...vote,
        role: target.name,
        from: sender.name,
      },
    ];
  });
}

function deliverMessages(
  ground: GroundFile,
  sender: RoleConfig,
  messages: RoleOutboundMessage[],
  roundNumber: number,
  bypassRestrictions = false,
  allowedTargetNames?: Set<string>,
) {
  const delivered: RoleMessage[] = [];

  for (const message of messages) {
    const recipients = resolveRecipients(
      ground,
      sender,
      message.role || "all",
      bypassRestrictions,
      allowedTargetNames,
    );

    for (const recipient of recipients) {
      const inboxEntry = createInboxEntry(roundNumber, sender.name, message.content);
      const roleIndex = ground.role.findIndex((role) => role.id === recipient.id);

      if (roleIndex !== -1) {
        ground.role[roleIndex] = {
          ...ground.role[roleIndex],
          inbox: [...ground.role[roleIndex].inbox, inboxEntry],
        };
      }

      delivered.push({
        from: sender.name,
        role: recipient.name,
        content: message.content,
      });
    }
  }

  return delivered;
}

function mergeRoleAction(ground: GroundFile, action: RoleActionRecord) {
  const roleIndex = ground.role.findIndex((role) => role.id === action.roleId);

  if (roleIndex === -1) {
    return;
  }

  const role = ground.role[roleIndex];

  ground.role[roleIndex] = {
    ...role,
    knowledge_private: uniqueTextList([
      ...role.knowledge_private,
      ...action.knowledge_private,
    ]),
    knowledge_public: uniqueTextList([
      ...role.knowledge_public,
      ...action.knowledge_public,
    ]),
    redundancy: action.redundancy ?? role.redundancy,
    status: action.status ?? role.status,
    last_think: action.think || action.summary || role.last_think,
    last_error: action.error ?? "",
  };

  ground.knowledge = uniqueTextList([
    ...ground.knowledge,
    ...action.knowledge_public,
  ]);
}

export function applySaintPatch(ground: GroundFile, patch: SaintRolePatch) {
  const roleIndex = ground.role.findIndex((role) => role.name === patch.role || role.id === patch.role);

  if (roleIndex === -1) {
    return;
  }

  const role = ground.role[roleIndex];

  ground.role[roleIndex] = {
    ...role,
    status: patch.status ?? role.status,
    redundancy: patch.redundancy ?? role.redundancy,
    enabled: patch.enabled ?? role.enabled,
    blocked_role_names: patch.blocked_role_names
      ? uniqueTextList(patch.blocked_role_names)
      : role.blocked_role_names,
    unknown_role_names: patch.unknown_role_names
      ? uniqueTextList(patch.unknown_role_names)
      : role.unknown_role_names,
    knowledge_private: uniqueTextList([
      ...role.knowledge_private,
      ...patch.knowledge_private_add,
    ]),
    knowledge_public: uniqueTextList([
      ...role.knowledge_public,
      ...patch.knowledge_public_add,
    ]),
    inbox: [...role.inbox, ...patch.inbox_add.map((entry) => entry.trim()).filter(Boolean)],
  };

  ground.knowledge = uniqueTextList([
    ...ground.knowledge,
    ...patch.knowledge_public_add,
  ]);
}

export function applySaintJudgementToGround(
  ground: GroundFile,
  judgement: SaintJudgement,
) {
  const nextGround = structuredClone(ground) as GroundFile;

  for (const patch of judgement.role_updates) {
    applySaintPatch(nextGround, patch);
  }

  nextGround.workflow = {
    ...nextGround.workflow,
    pending_judgement: null,
  };
  nextGround.updatedAt = new Date().toISOString().slice(0, 10);

  return nextGround;
}

function buildEventInstructions(event: RoundEvent | null) {
  if (!event) {
    return "";
  }

  return `${event.title}: ${event.prompt}`;
}

function buildRoleMessages(
  ground: GroundFile,
  role: RoleConfig,
  options: AdvanceRoundOptions,
) {
  const language = getLanguageConfig();
  const prompts = getPrompts(language);

  const recentRounds = ground.round.slice(-3).map((round) => ({
    round: round.round,
    event: round.event,
    summary: round.summary,
    output: round.output,
    votes: round.votes,
  }));
  const event = normalizeEvent(options.event);
  const visiblePeers = getVisibleRolesForRole(ground, role).map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    status: candidate.status,
    enabled: candidate.enabled,
    public_knowledge_count: candidate.knowledge_public.length,
    inbox_seen_by_them: candidate.inbox.length,
  }));
  const schemaHint = language === "zh" ? {
    think: "string",
    summary: "string",
    knowledge_private: ["string"],
    knowledge_public: ["string"],
    status: "active | silent | dead",
    redundancy: 0,
    output: [
      {
        role: "目标角色名或 all",
        content: "该目标的消息内容",
      },
    ],
    vote: [{ thing: "正在投票的内容", role: "投票对象", vote: 1 }],
  } : {
    think: "string",
    summary: "string",
    knowledge_private: ["string"],
    knowledge_public: ["string"],
    status: "active | silent | dead",
    redundancy: 0,
    output: [
      {
        role: "exact target role name or all",
        content: "message content for that specific target",
      },
    ],
    vote: [{ thing: "what is being voted on", role: "who gets the vote", vote: 1 }],
  };
  const allowedMessageTargets =
    options.messageScope === "batch_only"
      ? getBatchRoles(ground, options.batchRoleIds, options.excludedRoleIds).map(
          (candidate) => candidate.name,
        )
      : visiblePeers.map((candidate) => candidate.name);

  const userContent = language === "zh" ? {
    task: "为该角色在模拟批次中生成下一步行动。",
    instructions: options.instructions ?? "",
    event_instructions: buildEventInstructions(event),
    round_goal: ground.simulation.round_goal,
    selected_for_current_batch: true,
    current_step_message_scope: options.messageScope ?? "public",
    allowed_message_targets: allowedMessageTargets,
    ground: {
      name: ground.name,
      description: ground.description,
      knowledge: ground.knowledge,
      rule: ground.rule,
    },
    role: {
      id: role.id,
      kind: role.kind,
      name: role.name,
      description: role.description,
      use_prompt: role.use_prompt,
      status: role.status,
      redundancy: role.redundancy,
      blocked_role_names: role.blocked_role_names,
      unknown_role_names: role.unknown_role_names,
      inbox: role.inbox,
      private_knowledge: role.knowledge_private,
      public_knowledge: role.knowledge_public,
    },
    visible_peers: visiblePeers,
    information_scope: [
      "你只知道你的私有知识、公共知识、收件箱、世界公共状态和可见角色。",
      "除非通过自己的知识来源明确揭示，否则你不知道其他角色的隐藏身份。",
    ],
    messaging_rules: [
      'output[] 可以包含零条或多条消息。',
      '每个独立目标消息使用一个数组项。',
      '如果 Alice 和 Bob 应该收到不同内容，请发出两个独立的输出项。',
      'role 字段必须是一个可见角色名或 "all"。',
      '对于这一步骤，只有 allowed_message_targets 中的名字是有效的消息目标。',
    ],
    recent_rounds: recentRounds,
    output_schema: schemaHint,
  } : {
    task: "Generate the next action for this role in the simulation batch.",
    instructions: options.instructions ?? "",
    event_instructions: buildEventInstructions(event),
    round_goal: ground.simulation.round_goal,
    selected_for_current_batch: true,
    current_step_message_scope: options.messageScope ?? "public",
    allowed_message_targets: allowedMessageTargets,
    ground: {
      name: ground.name,
      description: ground.description,
      knowledge: ground.knowledge,
      rule: ground.rule,
    },
    role: {
      id: role.id,
      kind: role.kind,
      name: role.name,
      description: role.description,
      use_prompt: role.use_prompt,
      status: role.status,
      redundancy: role.redundancy,
      blocked_role_names: role.blocked_role_names,
      unknown_role_names: role.unknown_role_names,
      inbox: role.inbox,
      private_knowledge: role.knowledge_private,
      public_knowledge: role.knowledge_public,
    },
    visible_peers: visiblePeers,
    information_scope: [
      "You only know what is in your private knowledge, public knowledge, inbox, ground public state, and visible_peers.",
      "You do not know another role's hidden identity unless it is explicitly revealed by your own knowledge sources.",
    ],
    messaging_rules: [
      'output[] may contain zero or more messages.',
      'Use one array item per distinct target message.',
      'If Alice and Bob should receive different content, emit two separate output items.',
      'The role field must be one visible role name or "all".',
      'For this current step, only names in allowed_message_targets are valid message targets.',
    ],
    recent_rounds: recentRounds,
    output_schema: schemaHint,
  };

  return [
    {
      role: "system" as const,
      content: [
        ...prompts.roleExecutionSystemLines,
        role.system_prompt.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(userContent, null, 2),
    },
  ];
}

function buildSaintPlanMessages(ground: GroundFile, saint: RoleConfig) {
  const language = getLanguageConfig();
  const prompts = getPrompts(language);

  const availableRoles = ground.role.filter(
    (role) => role.enabled && role.status !== "dead" && !isSaintRole(role),
  );
  const recentRounds = ground.round.slice(-3).map((round) => ({
    round: round.round,
    event: round.event,
    summary: round.summary,
    batch: round.batch,
    output: round.output,
    votes: round.votes,
  }));
  const schemaHint = language === "zh" ? {
    summary: "主持人提议的简短摘要",
    reasoning: "该计划适合的原因",
    instructions: "下一步的主持人指令",
    event: {
      type: "custom | death_vote",
      title: "事件标题",
      prompt: "事件提示词",
    },
    batch_role_names: ["具体角色名"],
    message_scope: "public | batch_only",
  } : {
    summary: "short summary for the host proposal",
    reasoning: "why this plan is appropriate",
    instructions: "the moderator instruction for the next step",
    event: {
      type: "custom | death_vote",
      title: "event title",
      prompt: "event prompt",
    },
    batch_role_names: ["exact role name"],
    message_scope: "public | batch_only",
  };

  const userContent = language === "zh" ? {
    task: "为模拟提议下一步的主持人计划。",
    ground: {
      name: ground.name,
      description: ground.description,
      knowledge: ground.knowledge,
      rule: ground.rule,
    },
    simulation: ground.simulation,
    planning_guardrails: [
      "一个批准的计划应该代表一个连贯的执行步骤。",
      "只有在当前步骤应该保持私密或内部范围时才使用 message_scope=batch_only。",
      "只有在当前步骤是公开可见的交流时才使用 message_scope=public。",
      "场景特定的调度规则应该来自存储的规则和 saint 提示词，而不是来自未说明的假设。",
    ],
    available_roles: availableRoles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      redundancy: role.redundancy,
      inbox_size: role.inbox.length,
    })),
    recent_rounds: recentRounds,
    output_schema: schemaHint,
  } : {
    task: "Propose the next host plan for the simulation.",
    ground: {
      name: ground.name,
      description: ground.description,
      knowledge: ground.knowledge,
      rule: ground.rule,
    },
    simulation: ground.simulation,
    planning_guardrails: [
      "One approved plan should represent one coherent execution step.",
      "Use message_scope=batch_only only when the current step should stay private or internally scoped.",
      "Use message_scope=public only when the current step is openly visible communication.",
      "Scene-specific scheduling rules should come from stored rules and saint prompt, not from unstated assumptions.",
    ],
    available_roles: availableRoles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      redundancy: role.redundancy,
      inbox_size: role.inbox.length,
    })),
    recent_rounds: recentRounds,
    output_schema: schemaHint,
  };

  return [
    {
      role: "system" as const,
      content: [
        ...prompts.saintPlanSystemLines,
        saint.system_prompt.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(userContent, null, 2),
    },
  ];
}

function buildSaintJudgementMessages(
  ground: GroundFile,
  saint: RoleConfig,
  round: ReturnType<typeof roundSchema.parse>,
) {
  const language = getLanguageConfig();
  const prompts = getPrompts(language);

  const schemaHint = language === "zh" ? {
    summary: "主持人裁决的简短摘要",
    reasoning: "为什么应该应用补丁",
    role_updates: [
      {
        role: "目标角色名",
        reason: "为什么应用补丁",
        status: "active | silent | dead",
        redundancy: 0,
        enabled: true,
        blocked_role_names: ["角色名"],
        unknown_role_names: ["角色名"],
        knowledge_private_add: ["string"],
        knowledge_public_add: ["string"],
        inbox_add: ["string"],
      },
    ],
  } : {
    summary: "short summary of the host judgement",
    reasoning: "why patches should be applied",
    role_updates: [
      {
        role: "target role name",
        reason: "why the patch is applied",
        status: "active | silent | dead",
        redundancy: 0,
        enabled: true,
        blocked_role_names: ["role-name"],
        unknown_role_names: ["role-name"],
        knowledge_private_add: ["string"],
        knowledge_public_add: ["string"],
        inbox_add: ["string"],
      },
    ],
  };

  const userContent = language === "zh" ? {
    task: "审核已执行的回合并提议任何应该被用户批准的角色补丁。",
    rules: ground.rule,
    public_knowledge: ground.knowledge,
    role_state: ground.role.map((role) => ({
      id: role.id,
      kind: role.kind,
      name: role.name,
      description: role.description,
      status: role.status,
      redundancy: role.redundancy,
      enabled: role.enabled,
      blocked_role_names: role.blocked_role_names,
      unknown_role_names: role.unknown_role_names,
      inbox: role.inbox,
      knowledge_private: role.knowledge_private,
      knowledge_public: role.knowledge_public,
    })),
    executed_round: round,
    output_schema: schemaHint,
  } : {
    task: "Review the executed round and propose any role patches that should be approved by the user.",
    rules: ground.rule,
    public_knowledge: ground.knowledge,
    role_state: ground.role.map((role) => ({
      id: role.id,
      kind: role.kind,
      name: role.name,
      description: role.description,
      status: role.status,
      redundancy: role.redundancy,
      enabled: role.enabled,
      blocked_role_names: role.blocked_role_names,
      unknown_role_names: role.unknown_role_names,
      inbox: role.inbox,
      knowledge_private: role.knowledge_private,
      knowledge_public: role.knowledge_public,
    })),
    executed_round: round,
    output_schema: schemaHint,
  };

  return [
    {
      role: "system" as const,
      content: [
        ...prompts.saintJudgementSystemLines,
        saint.system_prompt.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(userContent, null, 2),
    },
  ];
}

function buildMockEventTarget(ground: GroundFile, actor: RoleConfig) {
  return ground.role.find(
    (role) =>
      role.id !== actor.id &&
      role.kind !== "saint" &&
      role.status !== "dead" &&
      !actor.unknown_role_names.includes(role.name),
  );
}

function createMockAction(
  ground: GroundFile,
  role: RoleConfig,
  options: AdvanceRoundOptions,
): RoleAction {
  const event = normalizeEvent(options.event);
  const language = getLanguageConfig();
  const focus =
    buildEventInstructions(event) ||
    options.instructions?.trim() ||
    ground.simulation.round_goal ||
    ground.rule[0] ||
    "the current world state";

  const sharedFact =
    ground.knowledge[ground.knowledge.length - 1] ||
    `${role.name} notices that the world is still waiting for a new public fact.`;
  const visiblePeer = buildMockEventTarget(ground, role);
  const voteTarget =
    event?.type === "death_vote" ? buildMockEventTarget(ground, role) : visiblePeer;

  return {
    think: language === "zh" ? `${role.name} 正在回顾 "${focus}"，同时考虑最新的公共事实：${sharedFact}` : `${role.name} is reviewing "${focus}" while considering the latest public fact: ${sharedFact}`,
    summary: language === "zh" ? `${role.name} 为当前批次准备了一个小行动。` : `${role.name} prepared one small action for the current batch.`,
    knowledge_private: [language === "zh" ? `${role.name} 重新评估了当前目标：${focus}` : `${role.name} reassessed the current objective: ${focus}`],
    knowledge_public: [language === "zh" ? `${role.name} 分享了一个公共观察：${sharedFact}` : `${role.name} shared a public observation: ${sharedFact}`],
    status: role.status,
    redundancy: role.redundancy,
    output:
      visiblePeer && role.status !== "silent"
        ? [
            {
              role: visiblePeer.name,
              content: language === "zh" ? `${role.name}：关于 "${focus}"，我建议我们接下来优先考虑 "${sharedFact}"。` : `${role.name}: around "${focus}", I suggest we prioritize "${sharedFact}" next.`,
            },
          ]
        : [],
    vote:
      voteTarget && event?.type === "death_vote"
        ? [
            {
              thing: event.title || "death_vote",
              role: voteTarget.name,
              vote: 1,
            },
          ]
        : [],
  };
}

function createMockSaintPlan(ground: GroundFile): SaintPlan {
  const language = getLanguageConfig();
  const batchRoleNames = getBatchRoles(ground).map((role) => role.name);

  return saintPlanSchema.parse({
    summary: language === "zh" ? "saint 提议下一个模拟步骤。" : "saint proposes the next simulation step.",
    reasoning:
      language === "zh" ? "模拟主持人通过选择默认下一批次继续当前场景，并将场景特定的排序留给存储的规则和提示词。" : "The mock host continues the current scene by selecting the default next batch and leaving scene-specific sequencing to stored rules and prompts.",
    instructions:
      ground.simulation.round_goal ||
      (language === "zh" ? "根据最新的世界状态和每个角色的收件箱继续模拟。" : "Continue the simulation based on the latest world state and each role's inbox."),
    event: null,
    batch_role_names: batchRoleNames,
    message_scope: "public",
  });
}

function createMockSaintJudgement(
  ground: GroundFile,
  round: ReturnType<typeof roundSchema.parse>,
): SaintJudgement {
  const language = getLanguageConfig();

  if (round.event?.type === "death_vote" && round.votes.length > 0) {
    const tally = new Map<string, number>();

    for (const vote of round.votes) {
      tally.set(vote.role, (tally.get(vote.role) ?? 0) + vote.vote);
    }

    const [winnerName] =
      [...tally.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

    if (winnerName) {
      return saintJudgementSchema.parse({
        round: round.round,
        summary: language === "zh" ? `saint 提议在投票后标记 ${winnerName} 为死亡。` : `saint proposes to mark ${winnerName} as dead after the vote.`,
        reasoning: language === "zh" ? "死亡投票事件中得票最高。" : "Highest vote count in death vote event.",
        role_updates: [
          {
            role: winnerName,
            reason: language === "zh" ? "死亡投票事件中得票最高。" : "Highest vote count in death vote event.",
            status: "dead",
            knowledge_private_add: [],
            knowledge_public_add: [],
            inbox_add: [],
          },
        ],
      });
    }
  }

  return saintJudgementSchema.parse({
    round: round.round,
    summary: language === "zh" ? "saint 提议不进行任何回合后状态变更。" : "saint proposes no post-round state changes.",
    reasoning: language === "zh" ? "回合结果不需要任何强制补丁。" : "The round result does not require any mandatory patches.",
    role_updates: [],
  });
}

async function runLiveRole(
  ground: GroundFile,
  role: RoleConfig,
  options: AdvanceRoundOptions,
): Promise<RoleAction> {
  const model = role.model || ground.default_model;

  if (!model) {
    throw new Error(`角色 ${role.name} 缺少模型配置`);
  }

  const client = new OpenAI({
    apiKey: role.key || ground.default_key || process.env.OPENAI_API_KEY || "not-needed",
    baseURL: role.url || ground.default_url || undefined,
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: role.temperature,
    response_format: { type: "json_object" },
    messages: buildRoleMessages(
      ground,
      role,
      options,
    ),
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error(`角色 ${role.name} 返回了空内容`);
  }

  return roleActionSchema.parse(JSON.parse(extractJsonPayload(content)));
}

async function runLiveSaintPlan(
  ground: GroundFile,
  saint: RoleConfig,
): Promise<SaintPlan> {
  const model = saint.model || ground.default_model;

  if (!model) {
    throw new Error("saint 缺少模型配置");
  }

  const client = new OpenAI({
    apiKey: saint.key || ground.default_key || process.env.OPENAI_API_KEY || "not-needed",
    baseURL: saint.url || ground.default_url || undefined,
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: saint.temperature,
    response_format: { type: "json_object" },
    messages: buildSaintPlanMessages(ground, saint),
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("saint 返回了空内容");
  }

  return saintPlanSchema.parse(JSON.parse(extractJsonPayload(content)));
}

async function runLiveSaintJudgement(
  ground: GroundFile,
  saint: RoleConfig,
  round: ReturnType<typeof roundSchema.parse>,
): Promise<SaintJudgement> {
  const model = saint.model || ground.default_model;

  if (!model) {
    throw new Error("saint 缺少模型配置");
  }

  const client = new OpenAI({
    apiKey: saint.key || ground.default_key || process.env.OPENAI_API_KEY || "not-needed",
    baseURL: saint.url || ground.default_url || undefined,
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: saint.temperature,
    response_format: { type: "json_object" },
    messages: buildSaintJudgementMessages(ground, saint, round),
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("saint 返回了空内容");
  }

  return saintJudgementSchema.parse(JSON.parse(extractJsonPayload(content)));
}

async function executeRole(
  ground: GroundFile,
  role: RoleConfig,
  options: AdvanceRoundOptions,
): Promise<RoleActionRecord> {
  if (options.dryRun || ground.simulation.mode === "mock") {
    const mockAction = createMockAction(ground, role, options);

    return roleActionRecordSchema.parse({
      ...mockAction,
      roleId: role.id,
      roleName: role.name,
      roleKind: role.kind,
      mode: "mock",
    });
  }

  const canAttemptLive = Boolean(role.model || ground.default_model);

  if (!canAttemptLive && ground.simulation.mode === "auto") {
    const mockAction = createMockAction(ground, role, options);

    return roleActionRecordSchema.parse({
      ...mockAction,
      roleId: role.id,
      roleName: role.name,
      roleKind: role.kind,
      mode: "mock",
    });
  }

  try {
    const action = await runLiveRole(ground, role, options);

    return roleActionRecordSchema.parse({
      ...action,
      roleId: role.id,
      roleName: role.name,
      roleKind: role.kind,
      mode: "live",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM execution failure";
    const mockAction = createMockAction(ground, role, options);

    return roleActionRecordSchema.parse({
      ...mockAction,
      roleId: role.id,
      roleName: role.name,
      roleKind: role.kind,
      mode: "fallback",
      error: message,
    });
  }
}

export async function proposeSaintPlan(
  ground: GroundFile,
  options: { dryRun?: boolean } = {},
) {
  const saint = getSaintRole(ground);

  if (!saint || !saint.enabled || saint.status === "dead") {
    throw new Error("需要活跃的 saint 主机");
  }

  if (options.dryRun || ground.simulation.mode === "mock") {
    return createMockSaintPlan(ground);
  }

  const canAttemptLive = Boolean(saint.model || ground.default_model);

  if (!canAttemptLive && ground.simulation.mode === "auto") {
    return createMockSaintPlan(ground);
  }

  try {
    return await runLiveSaintPlan(ground, saint);
  } catch {
    return createMockSaintPlan(ground);
  }
}

export async function proposeSaintJudgement(
  ground: GroundFile,
  round: ReturnType<typeof roundSchema.parse>,
  options: { dryRun?: boolean } = {},
) {
  const saint = getSaintRole(ground);

  if (!saint || !saint.enabled || saint.status === "dead") {
    const language = getLanguageConfig();
    return saintJudgementSchema.parse({
      round: round.round,
      summary: language === "zh" ? "没有可用的 saint 主持人来提议回合后变更。" : "No saint host was available to propose post-round changes.",
      reasoning: language === "zh" ? "saint 不存在、已禁用或已死亡。" : "saint is absent, disabled, or dead.",
      role_updates: [],
    });
  }

  if (options.dryRun || ground.simulation.mode === "mock") {
    return createMockSaintJudgement(ground, round);
  }

  const canAttemptLive = Boolean(saint.model || ground.default_model);

  if (!canAttemptLive && ground.simulation.mode === "auto") {
    return createMockSaintJudgement(ground, round);
  }

  try {
    return await runLiveSaintJudgement(ground, saint, round);
  } catch {
    return createMockSaintJudgement(ground, round);
  }
}

function summarizeRound(
  participantNames: string[],
  output: RoleMessage[],
  votes: RoleVote[],
  event: RoundEvent | null,
) {
  const language = getLanguageConfig();
  const parts = [
    language === "zh" ? `${participantNames.join(", ")} 完成了一个批次的进展` : `${participantNames.join(", ")} completed one batch progression`,
    language === "zh" ? `生产了 ${output.length} 条已发送消息` : `produced ${output.length} delivered messages`,
    language === "zh" ? `${votes.length} 张选票` : `${votes.length} votes`,
  ];

  if (event) {
    parts.push(`${language === "zh" ? "事件" : "event"}: ${event.title}`);
  }

  return `${parts.join(", ")}。`;
}

export async function advanceGroundRound(
  currentGround: GroundFile,
  options: AdvanceRoundOptions = {},
) {
  const event = normalizeEvent(options.event);
  const excludedRoleIds = options.excludedRoleIds ?? [];
  const batchRoles = getBatchRoles(currentGround, options.batchRoleIds, excludedRoleIds);

  if (batchRoles.length === 0) {
    throw new Error("没有可参与下一步的角色");
  }

  const nextGround = structuredClone(currentGround) as GroundFile;
  const roundNumber = nextGround.round.length + 1;
  const before = createGroundSnapshot(nextGround);
  const roleActions: RoleActionRecord[] = [];
  const deliveredMessages: RoleMessage[] = [];
  const collectedVotes: RoleVote[] = [];
  const allowedTargetNames =
    options.messageScope === "batch_only"
      ? new Set(batchRoles.map((candidate) => candidate.name))
      : undefined;

  for (const role of batchRoles) {
    const freshRole = nextGround.role.find((candidate) => candidate.id === role.id);

    if (!freshRole) { continue; }

    const actionRecord = await executeRole(nextGround, freshRole, {
      ...options,
      event,
      excludedRoleIds,
    });

    const sanitizedMessages = deliverMessages(
      nextGround,
      freshRole,
      actionRecord.output,
      roundNumber,
      false,
      allowedTargetNames,
    );
    const sanitizedVotes = sanitizeVotes(nextGround, freshRole, actionRecord.vote);
    const normalizedRecord = roleActionRecordSchema.parse({
      ...actionRecord,
      output: sanitizedMessages,
      vote: sanitizedVotes,
    });

    mergeRoleAction(nextGround, normalizedRecord);
    roleActions.push(normalizedRecord);
    deliveredMessages.push(...sanitizedMessages);
    collectedVotes.push(...sanitizedVotes);
  }

  const participantNames = roleActions.map((action) => action.roleName);

  const newRound = roundSchema.parse({
    round: roundNumber,
    createdAt: new Date().toISOString(),
    batch: roleActions.map((action) => action.roleId),
    instructions: options.instructions ?? "",
    summary: summarizeRound(
      participantNames,
      deliveredMessages,
      collectedVotes,
      event,
    ),
    event,
    before,
    after: createGroundSnapshot(nextGround),
    output: deliveredMessages,
    votes: collectedVotes,
    roleActions,
  });

  nextGround.round = [...nextGround.round, newRound].slice(
    -nextGround.simulation.max_round_history,
  );

  const activeRoleCount = nextGround.role.filter(
    (role) => role.enabled && role.status !== "dead" && !isSaintRole(role),
  ).length;

  nextGround.simulation.current_batch_index =
    activeRoleCount === 0
      ? 0
      : (nextGround.simulation.current_batch_index + batchRoles.length) % activeRoleCount;

  nextGround.updatedAt = new Date().toISOString().slice(0, 10);

  return {
    ground: nextGround,
    round: newRound,
  };
}
