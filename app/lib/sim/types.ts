import { z } from "zod";

export const roleStatusSchema = z.enum(["active", "silent", "dead"]);
export const roleKindSchema = z.enum(["role", "saint"]);
export const roundEventTypeSchema = z.enum(["custom", "death_vote"]);

export const roleOutboundMessageSchema = z.object({
  role: z.string().default("all"),
  content: z.string().default(""),
});

export const roleMessageSchema = roleOutboundMessageSchema.extend({
  from: z.string().default(""),
});

export const roleVoteInputSchema = z.object({
  thing: z.string().default(""),
  role: z.string().default(""),
  vote: z.number().default(0),
});

export const roleVoteSchema = roleVoteInputSchema.extend({
  from: z.string().default(""),
});

export const saintRolePatchSchema = z.object({
  role: z.string().default(""),
  reason: z.string().default(""),
  status: roleStatusSchema.optional(),
  redundancy: z.coerce.number().int().optional(),
  enabled: z.boolean().optional(),
  blocked_role_names: z.array(z.string()).optional(),
  unknown_role_names: z.array(z.string()).optional(),
  knowledge_private_add: z.array(z.string()).default([]),
  knowledge_public_add: z.array(z.string()).default([]),
  inbox_add: z.array(z.string()).default([]),
});

export const roleActionSchema = z.object({
  think: z.string().default(""),
  summary: z.string().default(""),
  knowledge_private: z.array(z.string()).default([]),
  knowledge_public: z.array(z.string()).default([]),
  status: roleStatusSchema.default("active"),
  redundancy: z.coerce.number().int().default(0),
  output: z.array(roleOutboundMessageSchema).default([]),
  vote: z.array(roleVoteInputSchema).default([]),
});

export const saintActionSchema = z.object({
  think: z.string().default(""),
  summary: z.string().default(""),
  knowledge_public: z.array(z.string()).default([]),
  output: z.array(roleOutboundMessageSchema).default([]),
  role_updates: z.array(saintRolePatchSchema).default([]),
});

export const roleSchema = z.object({
  id: z.string().default(""),
  kind: roleKindSchema.default("role"),
  name: z.string().default("Unnamed Role"),
  description: z.string().default(""),
  use_prompt: z.string().default(""),
  system_prompt: z.string().default(""),
  canvas_position: z
    .object({
      x: z.number().default(0),
      y: z.number().default(0),
    })
    .default({ x: 0, y: 0 }),
  url: z.string().default(""),
  key: z.string().default(""),
  model: z.string().default(""),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  knowledge_private: z.array(z.string()).default([]),
  knowledge_public: z.array(z.string()).default([]),
  blocked_role_names: z.array(z.string()).default([]),
  unknown_role_names: z.array(z.string()).default([]),
  inbox: z.array(z.string()).default([]),
  redundancy: z.coerce.number().int().default(0),
  status: roleStatusSchema.default("active"),
  enabled: z.boolean().default(true),
  last_think: z.string().default(""),
  last_error: z.string().default(""),
});

export const simulationConfigSchema = z.object({
  batch_size: z.coerce.number().int().min(1).max(20).default(2),
  current_batch_index: z.coerce.number().int().min(0).default(0),
  max_round_history: z.coerce.number().int().min(1).max(200).default(50),
  mode: z.enum(["auto", "live", "mock"]).default("auto"),
  round_goal: z.string().default(""),
});

export const roundEventSchema = z.object({
  type: roundEventTypeSchema,
  title: z.string().default(""),
  prompt: z.string().default(""),
});

export const defaultSimulationConfig = {
  batch_size: 2,
  current_batch_index: 0,
  max_round_history: 50,
  mode: "auto" as const,
  round_goal: "",
};

export const roleActionRecordSchema = z.object({
  roleId: z.string().default(""),
  roleName: z.string().default(""),
  roleKind: roleKindSchema.default("role"),
  mode: z.enum(["mock", "live", "fallback"]).default("mock"),
  think: z.string().default(""),
  summary: z.string().default(""),
  knowledge_private: z.array(z.string()).default([]),
  knowledge_public: z.array(z.string()).default([]),
  status: roleStatusSchema.optional(),
  redundancy: z.coerce.number().int().optional(),
  output: z.array(roleMessageSchema).default([]),
  vote: z.array(roleVoteSchema).default([]),
  role_updates: z.array(saintRolePatchSchema).default([]),
  error: z.string().optional(),
});

export const roundSchema = z.object({
  round: z.coerce.number().int().min(1).default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  batch: z.array(z.string()).default([]),
  instructions: z.string().default(""),
  summary: z.string().default(""),
  event: roundEventSchema.nullable().default(null),
  before: z.unknown().default({}),
  after: z.unknown().default({}),
  output: z.array(roleMessageSchema).default([]),
  votes: z.array(roleVoteSchema).default([]),
  roleActions: z.array(roleActionRecordSchema).default([]),
});

export const groundSchema = z.object({
  id: z.string().default(""),
  name: z.string().default("Untitled Ground"),
  description: z.string().default(""),
  default_url: z.string().default(""),
  default_key: z.string().default(""),
  default_model: z.string().default(""),
  knowledge: z.array(z.string()).default([]),
  rule: z.array(z.string()).default([]),
  role: z.array(roleSchema).default([]),
  round: z.array(roundSchema).default([]),
  simulation: simulationConfigSchema.default(defaultSimulationConfig),
  createdAt: z.string().default(() => new Date().toISOString().slice(0, 10)),
  updatedAt: z.string().default(() => new Date().toISOString().slice(0, 10)),
});

export type RoleStatus = z.infer<typeof roleStatusSchema>;
export type RoleKind = z.infer<typeof roleKindSchema>;
export type RoundEventType = z.infer<typeof roundEventTypeSchema>;
export type RoleOutboundMessage = z.infer<typeof roleOutboundMessageSchema>;
export type RoleMessage = z.infer<typeof roleMessageSchema>;
export type RoleVoteInput = z.infer<typeof roleVoteInputSchema>;
export type RoleVote = z.infer<typeof roleVoteSchema>;
export type SaintRolePatch = z.infer<typeof saintRolePatchSchema>;
export type RoleAction = z.infer<typeof roleActionSchema>;
export type SaintAction = z.infer<typeof saintActionSchema>;
export type RoleConfig = z.infer<typeof roleSchema>;
export type SimulationConfig = z.infer<typeof simulationConfigSchema>;
export type RoundEvent = z.infer<typeof roundEventSchema>;
export type RoleActionRecord = z.infer<typeof roleActionRecordSchema>;
export type RoundRecord = z.infer<typeof roundSchema>;
export type GroundFile = z.infer<typeof groundSchema>;

export interface GroundSnapshotRole {
  id: string;
  kind: RoleKind;
  name: string;
  status: RoleStatus;
  redundancy: number;
  enabled: boolean;
  knowledge_private: string[];
  knowledge_public: string[];
  blocked_role_names: string[];
  unknown_role_names: string[];
  inbox: string[];
  last_think: string;
  last_error: string;
}

export interface GroundSnapshot {
  id: string;
  name: string;
  description: string;
  knowledge: string[];
  rule: string[];
  role: GroundSnapshotRole[];
  simulation: SimulationConfig;
}

export interface GroundSummary {
  id: string;
  name: string;
  description: string;
  default_url: string;
  default_key: string;
  default_model: string;
  createdAt: string;
  updatedAt: string;
  roleCount: number;
  roundCount: number;
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function uniqueTextList(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function normalizeRoleStatus(value?: string): RoleStatus {
  if (value === "active" || value === "silent" || value === "dead") {
    return value;
  }

  return "active";
}

export function normalizeRoleKind(value?: string, name?: string): RoleKind {
  if (value === "saint" || name?.trim().toLowerCase() === "saint") {
    return "saint";
  }

  return "role";
}

export function createRoleId(seed = "role") {
  const safeSeed = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${safeSeed || "role"}-${suffix}`;
}

export function isSaintRole(role: Pick<RoleConfig, "kind" | "name">) {
  return role.kind === "saint" || role.name.trim().toLowerCase() === "saint";
}

export function createDefaultSaintRole(
  defaults: Pick<GroundFile, "default_url" | "default_key" | "default_model">,
): RoleConfig {
  return roleSchema.parse({
    id: "saint",
    kind: "saint",
    name: "saint",
    description: "Special adjudicator role with authority to interpret rules and apply world-state changes.",
    use_prompt:
      "You are saint, the world adjudicator. You can inspect every role, read all votes, and apply rule-based changes to the world.",
    system_prompt:
      "You are the final adjudicator of this simulation. You see all roles and all votes. Apply the ground rules, resolve events, and emit precise structured role updates when a role's status or attributes must change.",
    canvas_position: {
      x: 80,
      y: 120,
    },
    url: defaults.default_url,
    key: defaults.default_key,
    model: defaults.default_model,
    temperature: 0.2,
    knowledge_private: [],
    knowledge_public: [],
    blocked_role_names: [],
    unknown_role_names: [],
    inbox: [],
    redundancy: 0,
    status: "active",
    enabled: true,
    last_think: "",
    last_error: "",
  });
}

export function createGroundSnapshot(ground: GroundFile): GroundSnapshot {
  return {
    id: ground.id,
    name: ground.name,
    description: ground.description,
    knowledge: [...ground.knowledge],
    rule: [...ground.rule],
    role: ground.role.map((role) => ({
      id: role.id,
      kind: role.kind,
      name: role.name,
      status: role.status,
      redundancy: role.redundancy,
      enabled: role.enabled,
      knowledge_private: [...role.knowledge_private],
      knowledge_public: [...role.knowledge_public],
      blocked_role_names: [...role.blocked_role_names],
      unknown_role_names: [...role.unknown_role_names],
      inbox: [...role.inbox],
      last_think: role.last_think,
      last_error: role.last_error,
    })),
    simulation: { ...ground.simulation },
  };
}

export function getSaintRole(ground: GroundFile) {
  return ground.role.find((role) => isSaintRole(role)) ?? null;
}

export function getAliveRoles(ground: GroundFile) {
  return ground.role.filter((role) => role.enabled && role.status !== "dead");
}

export function getActiveRoles(ground: GroundFile) {
  return getAliveRoles(ground).filter((role) => role.kind !== "saint");
}

export function getBatchRoles(
  ground: GroundFile,
  batchRoleIds?: string[],
  excludedRoleIds: string[] = [],
) {
  const excluded = new Set(excludedRoleIds);
  const activeRoles = getActiveRoles(ground).filter((role) => !excluded.has(role.id));

  if (activeRoles.length === 0) {
    return [];
  }

  if (batchRoleIds && batchRoleIds.length > 0) {
    const batch = activeRoles.filter((role) => batchRoleIds.includes(role.id));
    return batch.length > 0 ? batch : activeRoles.slice(0, ground.simulation.batch_size);
  }

  const size = Math.min(
    Math.max(ground.simulation.batch_size, 1),
    activeRoles.length,
  );
  const start = ground.simulation.current_batch_index % activeRoles.length;
  const batch: RoleConfig[] = [];

  for (let index = 0; index < size; index += 1) {
    batch.push(activeRoles[(start + index) % activeRoles.length]);
  }

  return batch;
}

export function createInboxEntry(roundNumber: number, senderName: string, content: string) {
  return `[Round ${roundNumber}] ${senderName}: ${content}`;
}

export function createEmptyGround(id: string, input: Partial<GroundFile> = {}): GroundFile {
  const today = todayStamp();
  return groundSchema.parse({
    id,
    name: input.name ?? `Ground ${id}`,
    description: input.description ?? "",
    default_url: input.default_url ?? "",
    default_key: input.default_key ?? "",
    default_model: input.default_model ?? "",
    knowledge: input.knowledge ?? [],
    rule: input.rule ?? [],
    role: [],
    round: [],
    simulation: input.simulation ?? defaultSimulationConfig,
    createdAt: input.createdAt ?? today,
    updatedAt: input.updatedAt ?? today,
  });
}

export function toGroundSummary(ground: GroundFile): GroundSummary {
  return {
    id: ground.id,
    name: ground.name,
    description: ground.description,
    default_url: ground.default_url,
    default_key: ground.default_key,
    default_model: ground.default_model,
    createdAt: ground.createdAt,
    updatedAt: ground.updatedAt,
    roleCount: ground.role.length,
    roundCount: ground.round.length,
  };
}
