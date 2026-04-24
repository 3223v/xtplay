import OpenAI from "openai";

import {
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
  roundEventSchema,
  roundSchema,
  roleActionRecordSchema,
  roleActionSchema,
  saintActionSchema,
  SaintAction,
  SaintRolePatch,
  uniqueTextList,
} from "./types";

interface AdvanceRoundOptions {
  instructions?: string;
  event?: RoundEvent | null;
  batchRoleIds?: string[];
  excludedRoleIds?: string[];
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

  if (parsed.type === "death_vote") {
    return {
      ...parsed,
      title: parsed.title || "Death Vote",
      prompt:
        parsed.prompt ||
        "A death vote is active. Each participating non-saint role should vote for one visible, living, non-saint role that they believe should die. Explain your reasoning in think, and put the vote target in vote[].",
    };
  }

  return parsed;
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
) {
  if (targetName === "all") {
    return ground.role.filter((candidate) =>
      canDeliverMessage(sender, candidate, bypassRestrictions),
    );
  }

  const candidate = ground.role.find((role) => role.name === targetName);

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
) {
  const delivered: RoleMessage[] = [];

  for (const message of messages) {
    const recipients = resolveRecipients(
      ground,
      sender,
      message.role || "all",
      bypassRestrictions,
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

function applySaintPatch(ground: GroundFile, patch: SaintRolePatch) {
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

function buildEventInstructions(event: RoundEvent | null) {
  if (!event) {
    return "";
  }

  return `${event.title}: ${event.prompt}`;
}

function buildRoleMessages(
  ground: GroundFile,
  role: RoleConfig,
  batchNames: string[],
  options: AdvanceRoundOptions,
) {
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
    kind: candidate.kind,
    description: candidate.description,
    status: candidate.status,
    enabled: candidate.enabled,
  }));
  const schemaHint = {
    think: "string",
    summary: "string",
    knowledge_private: ["string"],
    knowledge_public: ["string"],
    status: "active | silent | dead",
    redundancy: 0,
    output: [{ role: "target role name or all", content: "message content" }],
    vote: [{ thing: "what is being voted on", role: "who gets the vote", vote: 1 }],
  };

  return [
    {
      role: "system" as const,
      content: [
        "You are participating in a turn-based world simulation.",
        "Stay in character and decide your next action for this batch.",
        "Return JSON only. Do not include markdown fences or prose outside the JSON object.",
        role.system_prompt.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          task: "Generate the next action for this role in the simulation batch.",
          instructions: options.instructions ?? "",
          event_instructions: buildEventInstructions(event),
          round_goal: ground.simulation.round_goal,
          batch: batchNames,
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
          recent_rounds: recentRounds,
          output_schema: schemaHint,
        },
        null,
        2,
      ),
    },
  ];
}

function buildSaintMessages(
  ground: GroundFile,
  saint: RoleConfig,
  options: AdvanceRoundOptions,
  currentVotes: RoleVote[],
  currentMessages: RoleMessage[],
) {
  const event = normalizeEvent(options.event);
  const schemaHint = {
    think: "string",
    summary: "string",
    knowledge_public: ["string"],
    output: [{ role: "target role name or all", content: "message content" }],
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

  return [
    {
      role: "system" as const,
      content: [
        "You are saint, the adjudicator of this simulation.",
        "You can inspect all roles, all votes, all visible messages, and all rules.",
        "You may update role status or gameplay attributes when the rules or event outcome require it.",
        "Return JSON only. Do not include markdown fences or prose outside the JSON object.",
        saint.system_prompt.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          task: "Review the current round, interpret the event and rules, then decide whether role attributes must change.",
          instructions: options.instructions ?? "",
          event,
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
          current_round_votes: currentVotes,
          current_round_messages: currentMessages,
          output_schema: schemaHint,
        },
        null,
        2,
      ),
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
    think: `${role.name} is reviewing "${focus}" while considering the latest public fact: ${sharedFact}`,
    summary: `${role.name} prepared one small action for the current batch.`,
    knowledge_private: [`${role.name} reassessed the current objective: ${focus}`],
    knowledge_public: [`${role.name} shared a public observation: ${sharedFact}`],
    status: role.status,
    redundancy: role.redundancy,
    output:
      visiblePeer && role.status !== "silent"
        ? [
            {
              role: visiblePeer.name,
              content: `${role.name}: around "${focus}", I suggest we prioritize "${sharedFact}" next.`,
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

function createMockSaintAction(
  ground: GroundFile,
  options: AdvanceRoundOptions,
  currentVotes: RoleVote[],
): SaintAction {
  const event = normalizeEvent(options.event);

  if (event?.type === "death_vote" && currentVotes.length > 0) {
    const tally = new Map<string, number>();

    for (const vote of currentVotes) {
      tally.set(vote.role, (tally.get(vote.role) ?? 0) + vote.vote);
    }

    const [winnerName] =
      [...tally.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

    if (winnerName) {
      return {
        think: `saint reviewed the death vote event and counted the ballots.`,
        summary: `saint resolved the death vote and marked ${winnerName} as dead.`,
        knowledge_public: [`saint resolved the event ${event.title}.`],
        output: [
          {
            role: "all",
            content: `saint: after reviewing the votes, ${winnerName} is now dead.`,
          },
        ],
        role_updates: [
          {
            role: winnerName,
            reason: "Highest vote count in death vote event.",
            status: "dead",
            knowledge_private_add: [],
            knowledge_public_add: [],
            inbox_add: [],
          },
        ],
      };
    }
  }

  return {
    think: "saint observed the round and found no forced state changes.",
    summary: "saint kept the world state unchanged.",
    knowledge_public: [],
    output: [],
    role_updates: [],
  };
}

async function runLiveRole(
  ground: GroundFile,
  role: RoleConfig,
  options: AdvanceRoundOptions,
): Promise<RoleAction> {
  const model = role.model || ground.default_model;

  if (!model) {
    throw new Error(`Role ${role.name} missing model configuration`);
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
      getBatchRoles(ground, options.batchRoleIds, options.excludedRoleIds).map(
        (batchRole) => batchRole.name,
      ),
      options,
    ),
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error(`Role ${role.name} returned empty content`);
  }

  return roleActionSchema.parse(JSON.parse(extractJsonPayload(content)));
}

async function runLiveSaint(
  ground: GroundFile,
  saint: RoleConfig,
  options: AdvanceRoundOptions,
  currentVotes: RoleVote[],
  currentMessages: RoleMessage[],
) {
  const model = saint.model || ground.default_model;

  if (!model) {
    throw new Error("saint missing model configuration");
  }

  const client = new OpenAI({
    apiKey: saint.key || ground.default_key || process.env.OPENAI_API_KEY || "not-needed",
    baseURL: saint.url || ground.default_url || undefined,
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: saint.temperature,
    response_format: { type: "json_object" },
    messages: buildSaintMessages(ground, saint, options, currentVotes, currentMessages),
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("saint returned empty content");
  }

  return saintActionSchema.parse(JSON.parse(extractJsonPayload(content)));
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

async function executeSaint(
  ground: GroundFile,
  saint: RoleConfig,
  options: AdvanceRoundOptions,
  currentVotes: RoleVote[],
  currentMessages: RoleMessage[],
) {
  if (options.dryRun || ground.simulation.mode === "mock") {
    return roleActionRecordSchema.parse({
      ...createMockSaintAction(ground, options, currentVotes),
      roleId: saint.id,
      roleName: saint.name,
      roleKind: saint.kind,
      mode: "mock",
    });
  }

  const canAttemptLive = Boolean(saint.model || ground.default_model);

  if (!canAttemptLive && ground.simulation.mode === "auto") {
    return roleActionRecordSchema.parse({
      ...createMockSaintAction(ground, options, currentVotes),
      roleId: saint.id,
      roleName: saint.name,
      roleKind: saint.kind,
      mode: "mock",
    });
  }

  try {
    const saintAction = await runLiveSaint(
      ground,
      saint,
      options,
      currentVotes,
      currentMessages,
    );

    return roleActionRecordSchema.parse({
      ...saintAction,
      roleId: saint.id,
      roleName: saint.name,
      roleKind: saint.kind,
      mode: "live",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown saint execution failure";

    return roleActionRecordSchema.parse({
      ...createMockSaintAction(ground, options, currentVotes),
      roleId: saint.id,
      roleName: saint.name,
      roleKind: saint.kind,
      mode: "fallback",
      error: message,
    });
  }
}

function summarizeRound(
  participantNames: string[],
  output: RoleMessage[],
  votes: RoleVote[],
  event: RoundEvent | null,
  roleUpdatesCount: number,
) {
  const parts = [
    `${participantNames.join(", ")} completed one batch progression`,
    `produced ${output.length} delivered messages`,
    `${votes.length} votes`,
  ];

  if (roleUpdatesCount > 0) {
    parts.push(`${roleUpdatesCount} saint patches`);
  }

  if (event) {
    parts.push(`event: ${event.title}`);
  }

  return `${parts.join(", ")}.`;
}

export async function advanceGroundRound(
  currentGround: GroundFile,
  options: AdvanceRoundOptions = {},
) {
  const event = normalizeEvent(options.event);
  const excludedRoleIds = options.excludedRoleIds ?? [];
  const excludedSet = getExcludedSet(excludedRoleIds);
  const batchRoles = getBatchRoles(currentGround, options.batchRoleIds, excludedRoleIds);
  const saintRole = getSaintRole(currentGround);
  const saintParticipates =
    saintRole &&
    saintRole.enabled &&
    saintRole.status !== "dead" &&
    !excludedSet.has(saintRole.id);

  if (batchRoles.length === 0 && !saintParticipates) {
    throw new Error("No participating roles available for the next advance");
  }

  const nextGround = structuredClone(currentGround) as GroundFile;
  const roundNumber = nextGround.round.length + 1;
  const before = createGroundSnapshot(nextGround);
  const roleActions: RoleActionRecord[] = [];
  const deliveredMessages: RoleMessage[] = [];
  const collectedVotes: RoleVote[] = [];

  for (const role of batchRoles) {
    const freshRole = nextGround.role.find((candidate) => candidate.id === role.id);

    if (!freshRole) {
      continue;
    }

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

  if (saintParticipates && saintRole) {
    const freshSaint = nextGround.role.find((candidate) => candidate.id === saintRole.id);

    if (freshSaint) {
      const saintRecord = await executeSaint(
        nextGround,
        freshSaint,
        {
          ...options,
          event,
          excludedRoleIds,
        },
        collectedVotes,
        deliveredMessages,
      );

      for (const patch of saintRecord.role_updates) {
        applySaintPatch(nextGround, patch);
      }

      const saintMessages = deliverMessages(
        nextGround,
        freshSaint,
        saintRecord.output,
        roundNumber,
        true,
      );
      const normalizedSaintRecord = roleActionRecordSchema.parse({
        ...saintRecord,
        output: saintMessages,
      });

      mergeRoleAction(nextGround, normalizedSaintRecord);
      roleActions.push(normalizedSaintRecord);
      deliveredMessages.push(...saintMessages);
    }
  }

  const participantNames = roleActions.map((action) => action.roleName);
  const roleUpdatesCount = roleActions.reduce(
    (total, action) => total + action.role_updates.length,
    0,
  );

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
      roleUpdatesCount,
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
