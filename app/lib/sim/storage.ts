import fs from "fs";
import path from "path";

import {
  createEmptyGround,
  createRoleId,
  GroundFile,
  groundSchema,
  GroundSummary,
  normalizeRoleKind,
  normalizeRoleStatus,
  RoleConfig,
  roleActionRecordSchema,
  roleSchema,
  roundSchema,
  SimulationConfig,
  toGroundSummary,
  todayStamp,
  uniqueTextList,
} from "./types";

interface CachedGroundRecord {
  mtimeMs: number;
  ground: GroundFile;
}

interface CachedSummaryRecord {
  mtimeMs: number;
  summary: GroundSummary;
}

interface GroundCacheState {
  grounds: Map<string, CachedGroundRecord>;
  summaries: Map<string, CachedSummaryRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __xtplayGroundCache__: Map<string, GroundCacheState> | undefined;
}

function getUserDataPath(userId: string): string {
  return path.join(process.cwd(), "app", "api", "data", "users", userId);
}

function getGroundPath(userId: string, groundId: string): string {
  return path.join(getUserDataPath(userId), `ground_${groundId}.json`);
}

function getCacheKey(userId: string): string {
  return `user_${userId}`;
}

function getCacheState(userId: string): GroundCacheState {
  if (!globalThis.__xtplayGroundCache__) {
    globalThis.__xtplayGroundCache__ = new Map();
  }

  const key = getCacheKey(userId);
  let state = globalThis.__xtplayGroundCache__.get(key);

  if (!state) {
    state = {
      grounds: new Map(),
      summaries: new Map(),
    };
    globalThis.__xtplayGroundCache__.set(key, state);
  }

  return state;
}

function cloneGround(ground: GroundFile) {
  return structuredClone(ground);
}

function setSummaryCache(userId: string, groundId: string, summary: GroundSummary, mtimeMs: number) {
  getCacheState(userId).summaries.set(groundId, {
    mtimeMs,
    summary,
  });
}

function setGroundCache(userId: string, groundId: string, ground: GroundFile, mtimeMs: number) {
  const clonedGround = cloneGround(ground);
  const cache = getCacheState(userId);

  cache.grounds.set(groundId, {
    mtimeMs,
    ground: clonedGround,
  });
  setSummaryCache(userId, groundId, toGroundSummary(clonedGround), mtimeMs);
}

function clearGroundCache(userId: string, groundId: string) {
  const cache = getCacheState(userId);
  cache.grounds.delete(groundId);
  cache.summaries.delete(groundId);
}

function ensureUserDataPath(userId: string) {
  const userPath = getUserDataPath(userId);
  if (!fs.existsSync(userPath)) {
    fs.mkdirSync(userPath, { recursive: true });
  }
}

function normalizeSimulationConfig(
  input: Partial<SimulationConfig> | undefined,
  roleCount: number,
) {
  const simulation = {
    batch_size: input?.batch_size,
    current_batch_index: input?.current_batch_index,
    max_round_history: input?.max_round_history,
    mode: input?.mode,
    round_goal: input?.round_goal,
  };

  const parsed = groundSchema.shape.simulation.parse(simulation);

  if (roleCount === 0) {
    return {
      ...parsed,
      current_batch_index: 0,
    };
  }

  return {
    ...parsed,
    current_batch_index: parsed.current_batch_index % roleCount,
  };
}

function normalizeRole(
  role: Partial<RoleConfig> & { knowledge?: string[] },
  index: number,
  defaults: Pick<GroundFile, "default_url" | "default_key" | "default_model">,
  existingIds: Set<string>,
) {
  const parsed = roleSchema.parse({
    ...role,
    kind: normalizeRoleKind(role.kind, role.name),
    status: normalizeRoleStatus(role.status),
    knowledge_private: role.knowledge_private ?? role.knowledge ?? [],
    knowledge_public: role.knowledge_public ?? [],
    blocked_role_names: role.blocked_role_names ?? [],
    unknown_role_names: role.unknown_role_names ?? [],
    inbox: role.inbox ?? [],
    redundancy: role.redundancy ?? 0,
    url: role.url ?? defaults.default_url,
    key: role.key ?? defaults.default_key,
    model: role.model ?? defaults.default_model,
  });

  let nextId = parsed.id.trim();

  if (!nextId) {
    nextId = parsed.kind === "saint" ? "saint" : createRoleId(parsed.name || `role-${index + 1}`);
  }

  while (existingIds.has(nextId)) {
    nextId = parsed.kind === "saint" ? createRoleId("saint") : createRoleId(parsed.name || `role-${index + 1}`);
  }

  existingIds.add(nextId);

  return {
    ...parsed,
    id: nextId,
    name: parsed.kind === "saint" ? "saint" : parsed.name,
    knowledge_private: uniqueTextList(parsed.knowledge_private),
    knowledge_public: uniqueTextList(parsed.knowledge_public),
    blocked_role_names: uniqueTextList(parsed.blocked_role_names),
    unknown_role_names: uniqueTextList(parsed.unknown_role_names),
    inbox: parsed.inbox.map((entry) => entry.trim()).filter(Boolean),
  };
}

export function normalizeGroundData(groundId: string, input: unknown): GroundFile {
  const raw = typeof input === "object" && input !== null ? input : {};
  const baseGround = createEmptyGround(groundId, raw as Partial<GroundFile>);
  const existingIds = new Set<string>();

  const normalizedRole = (
    Array.isArray((raw as GroundFile).role) ? (raw as GroundFile).role : []
  ).map((role, index) =>
    normalizeRole(
      role as Partial<RoleConfig> & { knowledge?: string[] },
      index,
      {
        default_url: baseGround.default_url,
        default_key: baseGround.default_key,
        default_model: baseGround.default_model,
      },
      existingIds,
    ),
  );

  const normalizedRound = (
    Array.isArray((raw as GroundFile).round) ? (raw as GroundFile).round : []
  ).map((round, index) =>
    roundSchema.parse({
      ...round,
      round: typeof round?.round === "number" ? round.round : index + 1,
      event: round?.event ?? null,
      output: Array.isArray(round?.output) ? round.output : [],
      votes: Array.isArray(round?.votes)
        ? round.votes
        : Array.isArray((round as { vote?: unknown[] })?.vote)
          ? (round as { vote?: unknown[] }).vote
          : [],
      roleActions: Array.isArray(round?.roleActions)
        ? round.roleActions.map((action) =>
            roleActionRecordSchema.parse({
              ...action,
              roleKind: normalizeRoleKind(
                (action as { roleKind?: string })?.roleKind,
                (action as { roleName?: string })?.roleName,
              ),
              status:
                typeof (action as { status?: string })?.status === "string"
                  ? normalizeRoleStatus((action as { status?: string }).status)
                  : undefined,
              role_updates: Array.isArray((action as { role_updates?: unknown[] })?.role_updates)
                ? (action as { role_updates?: Array<Record<string, unknown>> }).role_updates?.map(
                    (patch) => ({
                      ...patch,
                      status:
                        typeof patch?.status === "string"
                          ? normalizeRoleStatus(patch.status)
                          : undefined,
                    }),
                  )
                : [],
            }),
          )
        : [],
    }),
  );

  const parsedGround = groundSchema.parse({
    ...baseGround,
    knowledge: uniqueTextList(baseGround.knowledge),
    rule: uniqueTextList(baseGround.rule),
    role: normalizedRole,
    round: normalizedRound,
    simulation: normalizeSimulationConfig(baseGround.simulation, normalizedRole.length),
  });

  return groundSchema.parse({
    ...parsedGround,
    simulation: normalizeSimulationConfig(parsedGround.simulation, parsedGround.role.length),
  });
}

export function readGroundData(userId: string, groundId: string) {
  ensureUserDataPath(userId);
  const filePath = getGroundPath(userId, groundId);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Ground ${groundId} not found`);
  }

  const currentStats = fs.statSync(filePath);
  const cachedGround = getCacheState(userId).grounds.get(groundId);

  if (cachedGround && cachedGround.mtimeMs === currentStats.mtimeMs) {
    return cloneGround(cachedGround.ground);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const ground = normalizeGroundData(groundId, JSON.parse(fileContent));
  const normalizedContent = JSON.stringify(ground, null, 2);
  let mtimeMs = currentStats.mtimeMs;

  if (normalizedContent !== fileContent.trim()) {
    fs.writeFileSync(filePath, normalizedContent);
    mtimeMs = fs.statSync(filePath).mtimeMs;
  }

  setGroundCache(userId, groundId, ground, mtimeMs);

  return cloneGround(ground);
}

export function writeGroundData(userId: string, groundId: string, data: GroundFile) {
  ensureUserDataPath(userId);
  const normalized = normalizeGroundData(groundId, {
    ...data,
    id: groundId,
    updatedAt: todayStamp(),
  });
  const filePath = getGroundPath(userId, groundId);

  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2));
  const mtimeMs = fs.statSync(filePath).mtimeMs;
  setGroundCache(userId, groundId, normalized, mtimeMs);

  return cloneGround(normalized);
}

export function groundExists(userId: string, groundId: string) {
  ensureUserDataPath(userId);
  return fs.existsSync(getGroundPath(userId, groundId));
}

export function listGrounds(userId: string) {
  ensureUserDataPath(userId);
  const userPath = getUserDataPath(userId);
  const files = fs.readdirSync(userPath);
  const groundIds = files
    .map((file) => file.match(/^ground_(\d+)\.json$/)?.[1] ?? null)
    .filter((value): value is string => value !== null)
    .sort((left, right) => Number(left) - Number(right));

  return groundIds.map((groundId) => readGroundData(userId, groundId));
}

export function listGroundSummaries(userId: string): GroundSummary[] {
  ensureUserDataPath(userId);
  const userPath = getUserDataPath(userId);
  const files = fs.readdirSync(userPath);
  const groundIds = files
    .map((file) => file.match(/^ground_(\d+)\.json$/)?.[1] ?? null)
    .filter((value): value is string => value !== null)
    .sort((left, right) => Number(left) - Number(right));

  return groundIds.map((groundId) => {
    const filePath = getGroundPath(userId, groundId);
    const fileStats = fs.statSync(filePath);
    const cache = getCacheState(userId);
    const cachedSummary = cache.summaries.get(groundId);

    if (cachedSummary && cachedSummary.mtimeMs === fileStats.mtimeMs) {
      return cachedSummary.summary;
    }

    const cachedGround = cache.grounds.get(groundId);

    if (cachedGround && cachedGround.mtimeMs === fileStats.mtimeMs) {
      const summary = toGroundSummary(cachedGround.ground);
      setSummaryCache(userId, groundId, summary, fileStats.mtimeMs);
      return summary;
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const raw = JSON.parse(fileContent) as Partial<GroundFile> & {
        role?: unknown[];
        round?: unknown[];
      };

      const summary = {
        id: groundId,
        name: typeof raw.name === "string" && raw.name.trim() ? raw.name : `Ground ${groundId}`,
        description: typeof raw.description === "string" ? raw.description : "",
        default_url: typeof raw.default_url === "string" ? raw.default_url : "",
        default_key: typeof raw.default_key === "string" ? raw.default_key : "",
        default_model: typeof raw.default_model === "string" ? raw.default_model : "",
        createdAt:
          typeof raw.createdAt === "string" && raw.createdAt
            ? raw.createdAt
            : todayStamp(),
        updatedAt:
          typeof raw.updatedAt === "string" && raw.updatedAt
            ? raw.updatedAt
            : fileStats.mtime.toISOString().slice(0, 10),
        roleCount: Array.isArray(raw.role) ? raw.role.length : 0,
        roundCount: Array.isArray(raw.round) ? raw.round.length : 0,
      };

      setSummaryCache(userId, groundId, summary, fileStats.mtimeMs);

      return summary;
    } catch (error) {
      console.error(`Failed to read summary for ground ${groundId}:`, error);

      const fallbackSummary = {
        id: groundId,
        name: `Ground ${groundId} (Unreadable)`,
        description: "This ground file could not be fully parsed.",
        default_url: "",
        default_key: "",
        default_model: "",
        createdAt: todayStamp(),
        updatedAt: fileStats.mtime.toISOString().slice(0, 10),
        roleCount: 0,
        roundCount: 0,
      };

      setSummaryCache(userId, groundId, fallbackSummary, fileStats.mtimeMs);

      return fallbackSummary;
    }
  });
}

export function getNextGroundId(userId: string) {
  const summaries = listGroundSummaries(userId);
  const maxId = summaries.reduce((current, ground) => {
    const numericId = Number(ground.id);
    return Number.isFinite(numericId) ? Math.max(current, numericId) : current;
  }, 0);

  return String(maxId + 1);
}

export function createGround(userId: string, input: Partial<GroundFile>) {
  const id = getNextGroundId(userId);
  const ground = createEmptyGround(id, input);
  return writeGroundData(userId, id, {
    ...ground,
    role: input.role ?? [],
    round: input.round ?? [],
  });
}

export function updateGround(userId: string, groundId: string, patch: Partial<GroundFile>) {
  const existing = readGroundData(userId, groundId);

  return writeGroundData(userId, groundId, {
    ...existing,
    ...patch,
    id: groundId,
    role: patch.role ?? existing.role,
    round: patch.round ?? existing.round,
    simulation: {
      ...existing.simulation,
      ...(patch.simulation ?? {}),
    },
  });
}

export function deleteGround(userId: string, groundId: string) {
  const filePath = getGroundPath(userId, groundId);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  clearGroundCache(userId, groundId);
}

export function undoLastRound(userId: string, groundId: string): GroundFile {
  const ground = readGroundData(userId, groundId);

  if (ground.round.length === 0) {
    return ground;
  }

  const lastRound = ground.round[ground.round.length - 1];

  const restoredRoleMap = new Map<string, RoleConfig>();
  for (const role of ground.role) {
    restoredRoleMap.set(role.id, { ...role });
  }

  for (const action of lastRound.roleActions) {
    const role = restoredRoleMap.get(action.roleId);
    if (!role) continue;

    if (action.knowledge_private.length > 0) {
      const privateSet = new Set(role.knowledge_private);
      for (const k of action.knowledge_private) {
        privateSet.delete(k);
      }
      role.knowledge_private = Array.from(privateSet);
    }

    if (action.knowledge_public.length > 0) {
      const publicSet = new Set(role.knowledge_public);
      for (const k of action.knowledge_public) {
        publicSet.delete(k);
      }
      role.knowledge_public = Array.from(publicSet);
    }

    if (action.output.length > 0) {
      const inboxSet = new Set(role.inbox);
      for (const msg of action.output) {
        inboxSet.delete(msg.content);
      }
      role.inbox = Array.from(inboxSet);
    }

    if (action.role_updates.length > 0) {
      for (const update of action.role_updates) {
        if (update.status !== undefined) {
          role.status = update.status;
        }
        if (update.redundancy !== undefined) {
          role.redundancy = update.redundancy;
        }
      }
    }

    if (action.think) {
      role.last_think = "";
    }
  }

  for (const msg of lastRound.output) {
    const targetRole = restoredRoleMap.get(msg.role);
    if (targetRole) {
      const inboxSet = new Set(targetRole.inbox);
      inboxSet.delete(msg.content);
      targetRole.inbox = Array.from(inboxSet);
    }
  }

  const restoredRoles = Array.from(restoredRoleMap.values());

  const updatedGround = {
    ...ground,
    role: restoredRoles,
    round: ground.round.slice(0, -1),
    simulation: {
      ...ground.simulation,
      current_batch_index: 0,
    },
    updatedAt: todayStamp(),
  };

  return writeGroundData(userId, groundId, updatedGround);
}

export interface ExportedGround {
  id: string;
  name: string;
  description: string;
  default_url: string;
  default_key: string;
  default_model: string;
  knowledge: string[];
  rule: string[];
  role: Array<{
    id: string;
    kind: string;
    name: string;
    description: string;
    use_prompt: string;
    system_prompt: string;
    canvas_position: { x: number; y: number };
    url: string;
    key: string;
    model: string;
    temperature: number;
    knowledge_private: string[];
    knowledge_public: string[];
    blocked_role_names: string[];
    unknown_role_names: string[];
    inbox: string[];
    redundancy: number;
    status: string;
    enabled: boolean;
    last_think: string;
    last_error: string;
  }>;
  round: [];
  simulation: {
    batch_size: number;
    current_batch_index: number;
    max_round_history: number;
    mode: string;
    round_goal: string;
  };
  workflow: {
    pending_plan: null;
    pending_judgement: null;
  };
  createdAt: string;
  updatedAt: string;
}

export function exportGroundData(userId: string, groundId: string): ExportedGround {
  const ground = readGroundData(userId, groundId);

  return {
    id: ground.id,
    name: ground.name,
    description: ground.description,
    default_url: ground.default_url,
    default_key: "",
    default_model: ground.default_model,
    knowledge: [...ground.knowledge],
    rule: [...ground.rule],
    role: ground.role.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      description: r.description,
      use_prompt: r.use_prompt,
      system_prompt: r.system_prompt,
      canvas_position: { ...r.canvas_position },
      url: "",
      key: "",
      model: r.model,
      temperature: r.temperature,
      knowledge_private: [...r.knowledge_private],
      knowledge_public: [...r.knowledge_public],
      blocked_role_names: [...r.blocked_role_names],
      unknown_role_names: [...r.unknown_role_names],
      inbox: [],
      redundancy: 0,
      status: r.status,
      enabled: r.enabled,
      last_think: "",
      last_error: "",
    })),
    round: [],
    simulation: {
      batch_size: ground.simulation.batch_size,
      current_batch_index: 0,
      max_round_history: ground.simulation.max_round_history,
      mode: ground.simulation.mode,
      round_goal: ground.simulation.round_goal,
    },
    workflow: {
      pending_plan: null,
      pending_judgement: null,
    },
    createdAt: ground.createdAt,
    updatedAt: ground.updatedAt,
  };
}