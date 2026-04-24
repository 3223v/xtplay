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
  var __xtplayGroundCache__: GroundCacheState | undefined;
}

function getDataPath() {
  return path.join(process.cwd(), "app", "api", "data");
}

export function getGroundPath(groundId: string) {
  return path.join(getDataPath(), `ground_${groundId}.json`);
}

function getCacheState(): GroundCacheState {
  if (!globalThis.__xtplayGroundCache__) {
    globalThis.__xtplayGroundCache__ = {
      grounds: new Map(),
      summaries: new Map(),
    };
  }

  return globalThis.__xtplayGroundCache__;
}

function cloneGround(ground: GroundFile) {
  return structuredClone(ground);
}

function setSummaryCache(groundId: string, summary: GroundSummary, mtimeMs: number) {
  getCacheState().summaries.set(groundId, {
    mtimeMs,
    summary,
  });
}

function setGroundCache(groundId: string, ground: GroundFile, mtimeMs: number) {
  const clonedGround = cloneGround(ground);
  const cache = getCacheState();

  cache.grounds.set(groundId, {
    mtimeMs,
    ground: clonedGround,
  });
  setSummaryCache(groundId, toGroundSummary(clonedGround), mtimeMs);
}

function clearGroundCache(groundId: string) {
  const cache = getCacheState();
  cache.grounds.delete(groundId);
  cache.summaries.delete(groundId);
}

function ensureDataPath() {
  fs.mkdirSync(getDataPath(), { recursive: true });
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

export function readGroundData(groundId: string) {
  ensureDataPath();
  const filePath = getGroundPath(groundId);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Ground ${groundId} not found`);
  }

  const currentStats = fs.statSync(filePath);
  const cachedGround = getCacheState().grounds.get(groundId);

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

  setGroundCache(groundId, ground, mtimeMs);

  return cloneGround(ground);
}

export function writeGroundData(groundId: string, data: GroundFile) {
  ensureDataPath();
  const normalized = normalizeGroundData(groundId, {
    ...data,
    id: groundId,
    updatedAt: todayStamp(),
  });
  const filePath = getGroundPath(groundId);

  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2));
  const mtimeMs = fs.statSync(filePath).mtimeMs;
  setGroundCache(groundId, normalized, mtimeMs);

  return cloneGround(normalized);
}

export function groundExists(groundId: string) {
  return fs.existsSync(getGroundPath(groundId));
}

export function listGrounds() {
  ensureDataPath();
  const files = fs.readdirSync(getDataPath());
  const groundIds = files
    .map((file) => file.match(/^ground_(\d+)\.json$/)?.[1] ?? null)
    .filter((value): value is string => value !== null)
    .sort((left, right) => Number(left) - Number(right));

  return groundIds.map((groundId) => readGroundData(groundId));
}

export function listGroundSummaries(): GroundSummary[] {
  ensureDataPath();
  const files = fs.readdirSync(getDataPath());
  const groundIds = files
    .map((file) => file.match(/^ground_(\d+)\.json$/)?.[1] ?? null)
    .filter((value): value is string => value !== null)
    .sort((left, right) => Number(left) - Number(right));

  return groundIds.map((groundId) => {
    const filePath = getGroundPath(groundId);
    const fileStats = fs.statSync(filePath);
    const cache = getCacheState();
    const cachedSummary = cache.summaries.get(groundId);

    if (cachedSummary && cachedSummary.mtimeMs === fileStats.mtimeMs) {
      return cachedSummary.summary;
    }

    const cachedGround = cache.grounds.get(groundId);

    if (cachedGround && cachedGround.mtimeMs === fileStats.mtimeMs) {
      const summary = toGroundSummary(cachedGround.ground);
      setSummaryCache(groundId, summary, fileStats.mtimeMs);
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

      setSummaryCache(groundId, summary, fileStats.mtimeMs);

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

      setSummaryCache(groundId, fallbackSummary, fileStats.mtimeMs);

      return fallbackSummary;
    }
  });
}

export function getNextGroundId() {
  const summaries = listGroundSummaries();
  const maxId = summaries.reduce((current, ground) => {
    const numericId = Number(ground.id);
    return Number.isFinite(numericId) ? Math.max(current, numericId) : current;
  }, 0);

  return String(maxId + 1);
}

export function createGround(input: Partial<GroundFile>) {
  const id = getNextGroundId();
  const ground = createEmptyGround(id, input);
  return writeGroundData(id, {
    ...ground,
    role: input.role ?? [],
    round: input.round ?? [],
  });
}

export function updateGround(groundId: string, patch: Partial<GroundFile>) {
  const existing = readGroundData(groundId);

  return writeGroundData(groundId, {
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

export function deleteGround(groundId: string) {
  const filePath = getGroundPath(groundId);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  clearGroundCache(groundId);
}
