"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowInstance,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  createRoleId,
  getBatchRoles,
  getSaintRole,
  GroundFile,
  isSaintRole,
  RoleConfig,
  RoundEventType,
  RoundRecord,
} from "@/app/lib/sim/types";

type EventTypeOption = "none" | RoundEventType;

type RoleNodeData = RoleConfig & {
  onEdit: (roleId: string) => void;
};

const AUTO_SAVE_DELAY_MS = 450;

function listToText(values: string[]) {
  return values.join("\n");
}

function textToList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRoundTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createDraftRole(ground: GroundFile, position?: { x: number; y: number }): RoleConfig {
  const defaultPosition = position ?? {
    x: 260 + (ground.role.length % 3) * 220,
    y: 140 + Math.floor(ground.role.length / 3) * 180,
  };

  return {
    id: createRoleId(`role-${ground.role.length + 1}`),
    kind: "role",
    name: `Role ${ground.role.length + 1}`,
    description: "Character role agent",
    use_prompt: "",
    system_prompt: "",
    canvas_position: defaultPosition,
    url: ground.default_url,
    key: ground.default_key,
    model: ground.default_model,
    temperature: 0.7,
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
  };
}

function buildGroundPatch(ground: GroundFile) {
  return {
    id: ground.id,
    name: ground.name,
    description: ground.description,
    default_url: ground.default_url,
    default_key: ground.default_key,
    default_model: ground.default_model,
    knowledge: ground.knowledge,
    rule: ground.rule,
    role: ground.role,
    simulation: ground.simulation,
    round: ground.round,
  };
}

function getStatusClass(status: RoleConfig["status"]) {
  if (status === "dead") {
    return "dead";
  }

  if (status === "silent") {
    return "silent";
  }

  return "active";
}

function RoleNode({
  id,
  data,
  selected,
}: NodeProps<Node<RoleNodeData>>) {
  const badge = data.kind === "saint" ? "SAINT" : data.enabled ? "ROLE" : "PAUSED";

  return (
    <div
      className={`role-node ${selected ? "selected" : ""} ${data.enabled ? "" : "disabled"} ${data.kind === "saint" ? "saint" : ""}`}
      onDoubleClick={() => data.onEdit(id)}
      title="Double-click to edit role"
    >
      <Handle type="target" position={Position.Top} className="handle" />
      <div className="role-header">
        <div className="role-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>
        <span className="role-badge">{badge}</span>
      </div>

      <div className="role-content">
        <div className="role-name">{data.name || "Unnamed Role"}</div>
        <div className="role-desc">{data.description || "No description yet."}</div>
      </div>

      <div className="role-meta">
        <span className={`status-pill ${getStatusClass(data.status)}`}>{data.status}</span>
        <span>red {data.redundancy}</span>
        <span>inbox {data.inbox.length}</span>
      </div>

      <div className="role-footer">
        <span className="edit-hint">Double-click to edit</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
}

const nodeTypes = {
  role: RoleNode,
};

function createRoleNode(role: RoleConfig, onEdit: (roleId: string) => void): Node<RoleNodeData> {
  return {
    id: role.id,
    type: "role",
    position: role.canvas_position,
    data: {
      ...role,
      onEdit,
    },
  };
}

interface RoleEditModalProps {
  role: RoleConfig;
  onClose: () => void;
  onSave: (role: RoleConfig) => void;
  onDelete: () => void;
}

function RoleEditModal({ role, onClose, onSave, onDelete }: RoleEditModalProps) {
  const [formData, setFormData] = useState<RoleConfig>(role);
  const [activeTab, setActiveTab] = useState<"basic" | "prompt" | "api" | "relations">("basic");
  const isSaint = isSaintRole(formData);

  useEffect(() => {
    setFormData(role);
  }, [role]);

  function updateField<Key extends keyof RoleConfig>(field: Key, value: RoleConfig[Key]) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="title-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <div>
              <h3>{isSaint ? "Edit saint" : "Edit Role"}</h3>
              <div className="modal-subtitle">
                {isSaint
                  ? "saint is the special adjudicator and cannot be deleted."
                  : "Configure behavior, visibility rules, and local state."}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-tabs">
          {[
            { key: "basic", label: "Basic" },
            { key: "prompt", label: "Prompt" },
            { key: "api", label: "API" },
            { key: "relations", label: "Relations" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-form">
          {activeTab === "basic" ? (
            <div className="tab-content">
              <div className="grid-two">
                <div className="form-group">
                  <label>
                    <span className="label-text">Name</span>
                    <input
                      className="form-input"
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Role name"
                      disabled={isSaint}
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">Status</span>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={(event) =>
                        updateField("status", event.target.value as RoleConfig["status"])
                      }
                    >
                      <option value="active">active</option>
                      <option value="silent">silent</option>
                      <option value="dead">dead</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">Description</span>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Describe this role"
                  />
                </label>
              </div>

              <div className="grid-two">
                <div className="form-group">
                  <label>
                    <span className="label-text">Redundancy</span>
                    <input
                      className="form-input"
                      type="number"
                      step="1"
                      value={formData.redundancy}
                      onChange={(event) =>
                        updateField("redundancy", Number(event.target.value) || 0)
                      }
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">Temperature</span>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      max={2}
                      step="0.1"
                      value={formData.temperature}
                      onChange={(event) =>
                        updateField("temperature", Number(event.target.value) || 0)
                      }
                    />
                  </label>
                </div>
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(event) => updateField("enabled", event.target.checked)}
                />
                <span>Enable this role to participate in advance</span>
              </label>
            </div>
          ) : null}

          {activeTab === "prompt" ? (
            <div className="tab-content">
              <div className="form-group">
                <label>
                  <span className="label-text">Use Prompt</span>
                  <textarea
                    className="form-textarea"
                    rows={5}
                    value={formData.use_prompt}
                    onChange={(event) => updateField("use_prompt", event.target.value)}
                    placeholder="User-facing prompt"
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">System Prompt</span>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={formData.system_prompt}
                    onChange={(event) => updateField("system_prompt", event.target.value)}
                    placeholder="System prompt for the role"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === "api" ? (
            <div className="tab-content">
              <div className="grid-two">
                <div className="form-group">
                  <label>
                    <span className="label-text">Base URL</span>
                    <input
                      className="form-input"
                      value={formData.url}
                      onChange={(event) => updateField("url", event.target.value)}
                      placeholder="https://api.example.com/v1"
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">Model</span>
                    <input
                      className="form-input"
                      value={formData.model}
                      onChange={(event) => updateField("model", event.target.value)}
                      placeholder="gpt-4.1-mini"
                    />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">API Key</span>
                  <input
                    className="form-input"
                    value={formData.key}
                    onChange={(event) => updateField("key", event.target.value)}
                    placeholder="Role-level key"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === "relations" ? (
            <div className="tab-content">
              <div className="grid-two">
                <div className="form-group">
                  <label>
                    <span className="label-text">Private Knowledge</span>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={listToText(formData.knowledge_private)}
                      onChange={(event) =>
                        updateField("knowledge_private", textToList(event.target.value))
                      }
                      placeholder="One item per line"
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">Public Knowledge</span>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={listToText(formData.knowledge_public)}
                      onChange={(event) =>
                        updateField("knowledge_public", textToList(event.target.value))
                      }
                      placeholder="One item per line"
                    />
                  </label>
                </div>
              </div>

              <div className="grid-two">
                <div className="form-group">
                  <label>
                    <span className="label-text">Blocked Role Names</span>
                    <textarea
                      className="form-textarea"
                      rows={5}
                      value={listToText(formData.blocked_role_names)}
                      onChange={(event) =>
                        updateField("blocked_role_names", textToList(event.target.value))
                      }
                      placeholder="Roles that cannot receive this role's messages"
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">Unknown Role Names</span>
                    <textarea
                      className="form-textarea"
                      rows={5}
                      value={listToText(formData.unknown_role_names)}
                      onChange={(event) =>
                        updateField("unknown_role_names", textToList(event.target.value))
                      }
                      placeholder="Roles that this role does not know exist"
                    />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">Inbox</span>
                  <textarea
                    className="form-textarea"
                    rows={7}
                    value={listToText(formData.inbox)}
                    onChange={(event) => updateField("inbox", textToList(event.target.value))}
                    placeholder="One inbox entry per line"
                  />
                </label>
              </div>

              <div className="grid-two">
                <div className="info-card">
                  <div className="info-title">Last Think</div>
                  <div className="info-body">
                    {formData.last_think || "This role has not executed a round yet."}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-title">Last Error</div>
                  <div className="info-body">{formData.last_error || "No error recorded."}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          {isSaint ? (
            <button className="btn btn-disabled" disabled>
              saint is required
            </button>
          ) : (
            <button className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <div className="footer-spacer" />
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(formData)}
            disabled={!formData.name.trim()}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

interface GroundSettingsModalProps {
  ground: GroundFile;
  onClose: () => void;
  onSave: (patch: Partial<GroundFile>) => void;
}

function GroundSettingsModal({ ground, onClose, onSave }: GroundSettingsModalProps) {
  const [name, setName] = useState(ground.name);
  const [description, setDescription] = useState(ground.description);
  const [rules, setRules] = useState(listToText(ground.rule));
  const [knowledge, setKnowledge] = useState(listToText(ground.knowledge));
  const [defaultUrl, setDefaultUrl] = useState(ground.default_url);
  const [defaultKey, setDefaultKey] = useState(ground.default_key);
  const [defaultModel, setDefaultModel] = useState(ground.default_model);
  const [batchSize, setBatchSize] = useState(String(ground.simulation.batch_size));
  const [mode, setMode] = useState(ground.simulation.mode);
  const [roundGoal, setRoundGoal] = useState(ground.simulation.round_goal);

  useEffect(() => {
    setName(ground.name);
    setDescription(ground.description);
    setRules(listToText(ground.rule));
    setKnowledge(listToText(ground.knowledge));
    setDefaultUrl(ground.default_url);
    setDefaultKey(ground.default_key);
    setDefaultModel(ground.default_model);
    setBatchSize(String(ground.simulation.batch_size));
    setMode(ground.simulation.mode);
    setRoundGoal(ground.simulation.round_goal);
  }, [ground]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="title-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                />
              </svg>
            </div>
            <div>
              <h3>Ground Settings</h3>
              <div className="modal-subtitle">
                Edit world rules, default model settings, and batch configuration.
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-form">
          <div className="tab-content">
            <div className="grid-two">
              <div className="form-group">
                <label>
                  <span className="label-text">Ground Name</span>
                  <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">Default Model</span>
                  <input
                    className="form-input"
                    value={defaultModel}
                    onChange={(event) => setDefaultModel(event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>
                <span className="label-text">Description</span>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
            </div>

            <div className="grid-two">
              <div className="form-group">
                <label>
                  <span className="label-text">Default URL</span>
                  <input
                    className="form-input"
                    value={defaultUrl}
                    onChange={(event) => setDefaultUrl(event.target.value)}
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">Default Key</span>
                  <input
                    className="form-input"
                    value={defaultKey}
                    onChange={(event) => setDefaultKey(event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="grid-two">
              <div className="form-group">
                <label>
                  <span className="label-text">Batch Size</span>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={20}
                    value={batchSize}
                    onChange={(event) => setBatchSize(event.target.value)}
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">Mode</span>
                  <select
                    className="form-input"
                    value={mode}
                    onChange={(event) =>
                      setMode(event.target.value as GroundFile["simulation"]["mode"])
                    }
                  >
                    <option value="auto">auto</option>
                    <option value="live">live</option>
                    <option value="mock">mock</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>
                <span className="label-text">Round Goal</span>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={roundGoal}
                  onChange={(event) => setRoundGoal(event.target.value)}
                />
              </label>
            </div>

            <div className="grid-two">
              <div className="form-group">
                <label>
                  <span className="label-text">Rules</span>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={rules}
                    onChange={(event) => setRules(event.target.value)}
                    placeholder="One rule per line"
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">Public Knowledge</span>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={knowledge}
                    onChange={(event) => setKnowledge(event.target.value)}
                    placeholder="One item per line"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-spacer" />
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSave({
                name,
                description,
                default_url: defaultUrl,
                default_key: defaultKey,
                default_model: defaultModel,
                rule: textToList(rules),
                knowledge: textToList(knowledge),
                simulation: {
                  ...ground.simulation,
                  batch_size: Math.max(1, Number(batchSize) || 1),
                  mode,
                  round_goal: roundGoal,
                },
              })
            }
          >
            Save Ground Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function GroundPageContent() {
  const searchParams = useSearchParams();
  const groundId = searchParams.get("g") || "1";

  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groundRef = useRef<GroundFile | null>(null);
  const localVersionRef = useRef(0);
  const saveVersionRef = useRef(0);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<Node<RoleNodeData>> | null>(null);

  const [ground, setGround] = useState<GroundFile | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<RoleNodeData>>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [showGroundSettings, setShowGroundSettings] = useState(false);
  const [roundInstruction, setRoundInstruction] = useState("");
  const [eventType, setEventType] = useState<EventTypeOption>("none");
  const [eventPrompt, setEventPrompt] = useState("");
  const [excludedRoleIds, setExcludedRoleIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const openRoleEditor = useCallback((roleId: string) => {
    setSelectedRoleId(roleId);
    setEditingRoleId(roleId);
  }, []);

  const syncNodes = useCallback(
    (nextGround: GroundFile) => {
      setNodes(nextGround.role.map((role) => createRoleNode(role, openRoleEditor)));
    },
    [openRoleEditor, setNodes],
  );

  const applyGround = useCallback(
    (
      nextGround: GroundFile,
      options?: { dirty?: boolean; localMutation?: boolean },
    ) => {
      groundRef.current = nextGround;

      if (options?.localMutation) {
        localVersionRef.current += 1;
      }

      setGround(nextGround);
      syncNodes(nextGround);
      setDirty(options?.dirty ?? false);
    },
    [syncNodes],
  );

  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  const schedulePersistGround = useCallback(() => {
    clearAutoSaveTimer();
    autoSaveTimerRef.current = setTimeout(() => {
      void persistGround();
    }, AUTO_SAVE_DELAY_MS);
  }, [clearAutoSaveTimer]);

  const mutateGround = useCallback(
    (
      updater: (current: GroundFile) => GroundFile,
      options?: { persist?: "debounced" | "immediate" },
    ) => {
      const currentGround = groundRef.current;

      if (!currentGround) {
        return;
      }

      const nextGround = updater(currentGround);
      applyGround(nextGround, { dirty: true, localMutation: true });

      if (options?.persist === "immediate") {
        clearAutoSaveTimer();
        void persistGround(nextGround);
      } else {
        schedulePersistGround();
      }
    },
    [applyGround, clearAutoSaveTimer, schedulePersistGround],
  );

  useEffect(() => {
    async function loadGround() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/ground?id=${groundId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load ground");
        }

        const nextGround = result.data as GroundFile;
        groundRef.current = nextGround;
        localVersionRef.current = 0;
        saveVersionRef.current = 0;
        applyGround(nextGround, { dirty: false });
        setSelectedRoleId(nextGround.role[0]?.id ?? null);
        setExcludedRoleIds([]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load ground");
      } finally {
        setIsLoading(false);
      }
    }

    void loadGround();
  }, [applyGround, groundId]);

  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
    };
  }, [clearAutoSaveTimer]);

  const editingRole = useMemo(
    () => ground?.role.find((role) => role.id === editingRoleId) ?? null,
    [editingRoleId, ground],
  );

  const rounds = useMemo<RoundRecord[]>(() => ground?.round ?? [], [ground]);

  const saintRole = useMemo(() => (ground ? getSaintRole(ground) : null), [ground]);

  const upcomingBatch = useMemo(() => {
    if (!ground) {
      return [];
    }

    return getBatchRoles(ground, undefined, excludedRoleIds);
  }, [excludedRoleIds, ground]);

  const upcomingParticipants = useMemo(() => {
    if (!ground) {
      return [];
    }

    const participants = [...upcomingBatch];

    if (
      saintRole &&
      saintRole.enabled &&
      saintRole.status !== "dead" &&
      !excludedRoleIds.includes(saintRole.id)
    ) {
      participants.push(saintRole);
    }

    return participants;
  }, [excludedRoleIds, ground, saintRole, upcomingBatch]);

  async function persistGround(nextGround?: GroundFile) {
    const targetGround = nextGround ?? groundRef.current;

    if (!targetGround) {
      return null;
    }

    const requestedVersion = localVersionRef.current;
    saveVersionRef.current = requestedVersion;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/ground", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildGroundPatch(targetGround)),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save ground");
      }

      const persistedGround = result.data as GroundFile;

      if (requestedVersion === localVersionRef.current) {
        groundRef.current = persistedGround;
        setGround(persistedGround);
        syncNodes(persistedGround);
        setDirty(false);
      } else {
        setDirty(true);
      }

      return persistedGround;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save ground");
      setDirty(true);
      return null;
    } finally {
      setIsSaving(false);

      if (saveVersionRef.current !== localVersionRef.current) {
        clearAutoSaveTimer();
        autoSaveTimerRef.current = setTimeout(() => {
          void persistGround();
        }, AUTO_SAVE_DELAY_MS);
      }
    }
  }

  async function advanceRound() {
    const currentGround = groundRef.current;

    if (!currentGround) {
      return;
    }

    setIsAdvancing(true);
    setError(null);

    try {
      let readyGround = currentGround;

      if (dirty) {
        const persisted = await persistGround(currentGround);

        if (!persisted) {
          return;
        }

        readyGround = persisted;
      }

      const event =
        eventType === "none"
          ? null
          : {
              type: eventType,
              title: eventType === "death_vote" ? "Death Vote" : "Custom Event",
              prompt: eventPrompt.trim(),
            };

      const response = await fetch(`/api/round?groundId=${readyGround.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructions: roundInstruction.trim(),
          event,
          excludedRoleIds,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to advance round");
      }

      const nextGround = result.ground as GroundFile;
      groundRef.current = nextGround;
      localVersionRef.current += 1;
      saveVersionRef.current = localVersionRef.current;
      applyGround(nextGround, { dirty: false });
      setRoundInstruction("");
      setEventPrompt("");
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : "Failed to advance round");
    } finally {
      setIsAdvancing(false);
    }
  }

  function addRole(position?: { x: number; y: number }) {
    const currentGround = groundRef.current;

    if (!currentGround) {
      return;
    }

    const newRole = createDraftRole(currentGround, position);

    mutateGround((current) => ({
      ...current,
      role: [...current.role, newRole],
    }), { persist: "immediate" });

    setSelectedRoleId(newRole.id);
    setEditingRoleId(newRole.id);
  }

  function removeRole(roleId: string) {
    const currentGround = groundRef.current;

    if (!currentGround) {
      return;
    }

    const target = currentGround.role.find((role) => role.id === roleId);

    if (target && isSaintRole(target)) {
      return;
    }

    const nextRoles = currentGround.role.filter((role) => role.id !== roleId);
    mutateGround((current) => ({
      ...current,
      role: current.role.filter((role) => role.id !== roleId),
    }), { persist: "immediate" });
    setEditingRoleId(null);
    setSelectedRoleId(nextRoles[0]?.id ?? null);
    setExcludedRoleIds((previous) => previous.filter((id) => id !== roleId));
  }

  function updateRole(updatedRole: RoleConfig) {
    mutateGround((current) => ({
      ...current,
      role: current.role.map((role) => (role.id === updatedRole.id ? updatedRole : role)),
    }), { persist: "immediate" });
    setSelectedRoleId(updatedRole.id);
    setEditingRoleId(null);
  }

  function moveRole(roleId: string, direction: -1 | 1) {
    const currentGround = groundRef.current;

    if (!currentGround) {
      return;
    }

    const currentIndex = currentGround.role.findIndex((role) => role.id === roleId);
    const targetIndex = currentIndex + direction;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentGround.role.length) {
      return;
    }

    const nextRoles = [...currentGround.role];
    const temp = nextRoles[targetIndex];
    nextRoles[targetIndex] = nextRoles[currentIndex];
    nextRoles[currentIndex] = temp;

    mutateGround((current) => ({
      ...current,
      role: nextRoles,
    }), { persist: "immediate" });
  }

  function toggleExcludedRole(roleId: string) {
    setExcludedRoleIds((previous) =>
      previous.includes(roleId)
        ? previous.filter((id) => id !== roleId)
        : [...previous, roleId],
    );
  }

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, type: string) {
    event.dataTransfer.setData("application/xtplay-node", type);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const type = event.dataTransfer.getData("application/xtplay-node");

    if (!type || type !== "role") {
      return;
    }

    const bounds = reactFlowWrapperRef.current?.getBoundingClientRect();

    const position = reactFlowInstance
      ? reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
      : {
          x: event.clientX - (bounds?.left ?? 0),
          y: event.clientY - (bounds?.top ?? 0),
        };

    addRole(position);
  }

  if (isLoading) {
    return (
      <div className="ground-loading">
        <div className="loading-card">Loading ground...</div>
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="ground-loading">
        <div className="error-card">
          <div>{error || "Failed to load ground."}</div>
          <Link href="/manage" className="back-link">
            Back to Manage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-screen">
      <div className="top-bar">
        <div className="brand-block">
          <Link href="/manage" className="crumb">
            Grounds
          </Link>
          <span className="crumb-separator">/</span>
          <span className="crumb current">{ground.name}</span>
        </div>

        <div className="top-actions">
          <span className={`sync-badge ${dirty ? "dirty" : "clean"}`}>
            {dirty ? "Unsaved Changes" : "Synced"}
          </span>
          <button
            onClick={() => setShowGroundSettings(true)}
            className="btn btn-secondary"
            disabled={isSaving || isAdvancing}
          >
            Ground Settings
          </button>
          <button
            onClick={() => void persistGround()}
            className="btn btn-secondary"
            disabled={isSaving || isAdvancing}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flow-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>{ground.name}</h3>
            <span className="component-count">{ground.role.length}</span>
          </div>

          <div className="sidebar-content">
            <div className="section-title">Components</div>

            <div
              className="draggable-item"
              draggable
              onDragStart={(event) => handleDragStart(event, "role")}
            >
              <div className="item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <div className="item-info">
                <span className="item-label">Role</span>
                <span className="item-desc">Drag to canvas to create a normal role node.</span>
              </div>
            </div>

            <button className="sidebar-add" onClick={() => addRole()}>
              Add Role Without Drag
            </button>

            <div className="section-title section-space">Role Order</div>
            <div className="role-list">
              {ground.role.map((role, index) => (
                <div
                  key={role.id}
                  className={`role-list-item ${selectedRoleId === role.id ? "selected" : ""}`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="role-list-main">
                    <span className="role-index">#{index + 1}</span>
                    <div className="role-list-text">
                      <div className="role-list-name">
                        {role.name}
                        {isSaintRole(role) ? <span className="saint-inline">saint</span> : null}
                      </div>
                      <div className="role-list-status">
                        {role.enabled ? role.status : "paused"} / red {role.redundancy}
                      </div>
                    </div>
                  </div>

                  <div className="role-list-actions">
                    <button
                      className="mini-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveRole(role.id, -1);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      className="mini-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveRole(role.id, 1);
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <p className="hint-text">Drag a role into the canvas, then double-click it to edit.</p>
          </div>
        </aside>

        <div
          ref={reactFlowWrapperRef}
          className="flow-wrapper"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <ReactFlow
            nodes={nodes}
            onNodesChange={onNodesChange}
            onInit={setReactFlowInstance}
            onNodeClick={(_, node) => setSelectedRoleId(node.id)}
            onNodeDragStop={(_, node) => {
              mutateGround((current) => ({
                ...current,
                role: current.role.map((role) =>
                  role.id === node.id
                    ? {
                        ...role,
                        canvas_position: {
                          x: node.position.x,
                          y: node.position.y,
                        },
                      }
                    : role,
                ),
              }), { persist: "debounced" });
            }}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} color="#2a2a4a" />
            <Controls className="flow-controls" />
            <MiniMap className="flow-minimap" nodeColor="#6366f1" maskColor="rgba(0,0,0,0.8)" />
          </ReactFlow>

          {error ? <div className="floating-error">{error}</div> : null}
        </div>

        <aside className="history-sidebar">
          <div className="history-header">
            <h3>Advance and History</h3>
            <span className="round-count">{rounds.length}</span>
          </div>

          <div className="history-content">
            <div className="advance-card">
              <div className="advance-title">Advance</div>
              <div className="advance-subtitle">
                Upcoming participants:{" "}
                {upcomingParticipants.length > 0
                  ? upcomingParticipants.map((role) => role.name).join(", ")
                  : "none"}
              </div>

              <textarea
                className="advance-input"
                rows={4}
                value={roundInstruction}
                onChange={(event) => setRoundInstruction(event.target.value)}
                placeholder="Optional instruction for the next advance"
              />

              <div className="advance-meta">
                <span>Mode: {ground.simulation.mode}</span>
                <span>Batch Size: {ground.simulation.batch_size}</span>
              </div>

              <button
                onClick={() => void advanceRound()}
                className="advance-button"
                disabled={isSaving || isAdvancing || upcomingParticipants.length === 0}
              >
                {isAdvancing ? "Advancing..." : "Advance"}
              </button>
            </div>

            <div className="event-card">
              <div className="advance-title">Event Injection</div>
              <div className="advance-subtitle">
                Inject a structured event into the next advance. saint will adjudicate it if saint participates.
              </div>

              <select
                className="advance-input select-input"
                value={eventType}
                onChange={(event) => setEventType(event.target.value as EventTypeOption)}
              >
                <option value="none">none</option>
                <option value="custom">custom</option>
                <option value="death_vote">death_vote</option>
              </select>

              <textarea
                className="advance-input"
                rows={4}
                value={eventPrompt}
                onChange={(event) => setEventPrompt(event.target.value)}
                placeholder={
                  eventType === "death_vote"
                    ? "Optional extra guidance for the death vote event"
                    : "Custom event prompt"
                }
              />
            </div>

            <div className="exclude-card">
              <div className="advance-title">Exclude From Next Advance</div>
              <div className="advance-subtitle">
                Excluded roles will not participate. saint can also be excluded.
              </div>

              <div className="exclude-list">
                {ground.role.map((role) => (
                  <label key={role.id} className="exclude-row">
                    <input
                      type="checkbox"
                      checked={excludedRoleIds.includes(role.id)}
                      onChange={() => toggleExcludedRole(role.id)}
                    />
                    <span>
                      {role.name} ({role.status})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="world-card">
              <div className="advance-title">World Summary</div>
              <div className="world-line">Rules: {ground.rule.length}</div>
              <div className="world-line">Public Knowledge: {ground.knowledge.length}</div>
              <div className="world-line">
                Enabled Roles: {ground.role.filter((role) => role.enabled).length} / {ground.role.length}
              </div>
            </div>

            {rounds.length > 0 ? (
              [...rounds].reverse().map((round) => (
                <div key={`${round.round}-${round.createdAt}`} className="round-item">
                  <div className="round-header">
                    <span className="round-number">Round {round.round}</span>
                    <span className="round-time">{formatRoundTime(round.createdAt)}</span>
                  </div>
                  {round.event ? (
                    <div className="round-event">
                      Event: {round.event.type} / {round.event.title}
                    </div>
                  ) : null}
                  <div className="round-summary">{round.summary || "No summary yet."}</div>
                  <div className="round-output">
                    {round.output.length > 0 ? (
                      round.output.slice(0, 3).map((message, index) => (
                        <div key={`${message.from}-${message.role}-${index}`} className="message">
                          <span className="message-role">
                            {message.from} -&gt; {message.role}:
                          </span>
                          <span className="message-content">{message.content}</span>
                        </div>
                      ))
                    ) : (
                      <div className="message empty">No delivered messages in this round.</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-history">
                <p>No round history yet.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showGroundSettings ? (
        <GroundSettingsModal
          ground={ground}
          onClose={() => setShowGroundSettings(false)}
          onSave={(patch) => {
            mutateGround((current) => ({
              ...current,
              ...patch,
              simulation: {
                ...current.simulation,
                ...(patch.simulation ?? {}),
              },
            }), { persist: "immediate" });
            setShowGroundSettings(false);
          }}
        />
      ) : null}

      {editingRole ? (
        <RoleEditModal
          role={editingRole}
          onClose={() => setEditingRoleId(null)}
          onSave={updateRole}
          onDelete={() => removeRole(editingRole.id)}
        />
      ) : null}

      <style jsx global>{`
        .flow-screen {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          background: #0a0a0f;
          color: #fff;
        }

        .top-bar {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid #1f1f2e;
          background: linear-gradient(180deg, rgba(18, 18, 26, 0.96) 0%, rgba(13, 13, 20, 0.96) 100%);
          backdrop-filter: blur(12px);
        }

        .brand-block {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .crumb {
          color: #a5b4fc;
          text-decoration: none;
        }

        .crumb.current {
          color: #fff;
        }

        .crumb-separator {
          color: #4b5563;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sync-badge {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }

        .sync-badge.clean {
          color: #bbf7d0;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .sync-badge.dirty {
          color: #fde68a;
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .flow-container {
          display: flex;
          flex: 1;
          min-height: 0;
          background: #0a0a0f;
        }

        .sidebar {
          width: 300px;
          height: 100%;
          background: linear-gradient(180deg, #12121a 0%, #0d0d14 100%);
          border-right: 1px solid #1f1f2e;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header,
        .history-header {
          padding: 20px;
          border-bottom: 1px solid #1f1f2e;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-header h3,
        .history-header h3 {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .component-count,
        .round-count {
          background: #6366f1;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .round-count {
          background: #10b981;
        }

        .sidebar-content {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }

        .section-title {
          color: #6b7280;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .section-space {
          margin-top: 20px;
        }

        .draggable-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%);
          border-radius: 10px;
          cursor: grab;
          border: 1px solid #2a2a3e;
          transition: all 0.25s ease;
        }

        .draggable-item:hover {
          background: linear-gradient(135deg, #1f1f3a 0%, #1a1a30 100%);
          border-color: #6366f1;
          transform: translateX(4px);
        }

        .item-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .item-icon svg {
          width: 20px;
          height: 20px;
          color: #fff;
        }

        .item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-label {
          color: #fff;
          font-size: 14px;
          font-weight: 500;
        }

        .item-desc {
          color: #6b7280;
          font-size: 11px;
          line-height: 1.5;
        }

        .sidebar-add {
          width: 100%;
          border: 1px solid #2a2a3e;
          border-radius: 10px;
          padding: 12px;
          background: #161625;
          color: #d1d5db;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sidebar-add:hover {
          border-color: #6366f1;
          color: #fff;
        }

        .role-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .role-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px;
          background: linear-gradient(135deg, #171724 0%, #12121d 100%);
          border: 1px solid #242438;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .role-list-item.selected {
          border-color: #6366f1;
          box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.25);
        }

        .role-list-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .role-index {
          color: #6366f1;
          font-size: 11px;
          font-weight: 700;
        }

        .role-list-text {
          min-width: 0;
        }

        .role-list-name {
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .saint-inline {
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 10px;
          background: rgba(245, 158, 11, 0.16);
          color: #fde68a;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .role-list-status {
          color: #6b7280;
          font-size: 11px;
          margin-top: 2px;
        }

        .role-list-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mini-action {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid #2a2a3e;
          background: #1c1c2b;
          color: #d1d5db;
          cursor: pointer;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #1f1f2e;
        }

        .hint-text {
          color: #4b5563;
          font-size: 11px;
          text-align: center;
        }

        .flow-wrapper {
          position: relative;
          flex: 1;
          height: 100%;
          background: radial-gradient(circle at top, rgba(44, 62, 124, 0.16) 0%, rgba(10, 10, 15, 0) 45%), #0a0a0f;
        }

        .history-sidebar {
          width: 360px;
          height: 100%;
          background: linear-gradient(180deg, #12121a 0%, #0d0d14 100%);
          border-left: 1px solid #1f1f2e;
          display: flex;
          flex-direction: column;
        }

        .history-content {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .advance-card,
        .event-card,
        .exclude-card,
        .world-card,
        .round-item {
          padding: 14px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%);
          border: 1px solid #2a2a3e;
          border-radius: 12px;
        }

        .advance-title {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }

        .advance-subtitle,
        .world-line {
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.5;
          margin-top: 6px;
        }

        .advance-input {
          width: 100%;
          margin-top: 12px;
          background: #0a0a0f;
          border: 1px solid #2a2a3e;
          border-radius: 10px;
          padding: 12px;
          color: #fff;
          font-size: 12px;
          resize: vertical;
          box-sizing: border-box;
        }

        .select-input {
          resize: none;
        }

        .advance-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          color: #6b7280;
          font-size: 11px;
        }

        .advance-button {
          width: 100%;
          margin-top: 12px;
          padding: 11px 14px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .advance-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .exclude-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }

        .exclude-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #d1d5db;
          font-size: 12px;
        }

        .round-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .round-number {
          color: #818cf8;
          font-size: 12px;
          font-weight: 700;
        }

        .round-time {
          color: #6b7280;
          font-size: 11px;
        }

        .round-event {
          margin-top: 8px;
          color: #fde68a;
          font-size: 11px;
        }

        .round-summary {
          margin-top: 8px;
          color: #d1d5db;
          font-size: 12px;
          line-height: 1.6;
        }

        .round-output {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .message {
          font-size: 12px;
          line-height: 1.5;
        }

        .message-role {
          color: #10b981;
          font-weight: 600;
          margin-right: 6px;
        }

        .message-content {
          color: #a3a3a3;
        }

        .message.empty {
          color: #6b7280;
        }

        .empty-history {
          padding: 18px;
          color: #6b7280;
          font-size: 12px;
          border: 1px dashed #2a2a3e;
          border-radius: 10px;
          text-align: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .btn-secondary {
          background: #1f1f2e;
          color: #d1d5db;
          border: 1px solid #2a2a3e;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #29293a;
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.16);
          color: #fecaca;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .btn-disabled {
          background: rgba(148, 163, 184, 0.12);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.16);
        }

        .role-node {
          background: linear-gradient(135deg, #1e1e3f 0%, #252550 100%);
          border: 1px solid #3b3b6f;
          border-radius: 12px;
          padding: 0;
          min-width: 220px;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
          overflow: hidden;
          transition: all 0.2s;
        }

        .role-node.saint {
          border-color: #f59e0b;
          box-shadow: 0 4px 24px rgba(245, 158, 11, 0.22);
        }

        .role-node:hover {
          border-color: #6366f1;
          box-shadow: 0 6px 30px rgba(99, 102, 241, 0.25);
        }

        .role-node.selected {
          border-color: #818cf8;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }

        .role-node.disabled {
          opacity: 0.72;
        }

        .role-header {
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .role-node.saint .role-header {
          background: linear-gradient(90deg, #f59e0b 0%, #f97316 100%);
        }

        .role-icon {
          width: 24px;
          height: 24px;
        }

        .role-icon svg {
          width: 100%;
          height: 100%;
          color: #fff;
        }

        .role-badge {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .role-content {
          padding: 12px 14px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .role-name {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
        }

        .role-desc {
          color: #9ca3af;
          font-size: 11px;
          line-height: 1.5;
        }

        .role-meta {
          display: flex;
          gap: 8px;
          padding: 0 14px 8px;
          color: #6b7280;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          flex-wrap: wrap;
        }

        .status-pill {
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .status-pill.active {
          background: rgba(16, 185, 129, 0.14);
          color: #bbf7d0;
        }

        .status-pill.silent {
          background: rgba(245, 158, 11, 0.14);
          color: #fde68a;
        }

        .status-pill.dead {
          background: rgba(239, 68, 68, 0.14);
          color: #fecaca;
        }

        .role-footer {
          padding: 8px 14px;
          border-top: 1px solid #2a2a4f;
        }

        .edit-hint {
          color: #6b7280;
          font-size: 10px;
        }

        .handle {
          width: 8px !important;
          height: 8px !important;
          background: #6366f1 !important;
          border: 2px solid #fff !important;
        }

        .floating-error {
          position: absolute;
          left: 20px;
          bottom: 20px;
          max-width: 420px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.22);
          color: #fecaca;
          font-size: 12px;
          z-index: 10;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(8px);
        }

        .modal-content {
          background: linear-gradient(180deg, #1a1a2e 0%, #12121a 100%);
          border: 1px solid #2a2a3e;
          border-radius: 16px;
          width: min(640px, 92vw);
          max-height: 88vh;
          overflow: hidden;
          box-shadow: 0 25px 75px rgba(0, 0, 0, 0.6);
        }

        .modal-wide {
          width: min(900px, 94vw);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid #2a2a3e;
          background: rgba(26, 26, 46, 0.8);
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-title h3 {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .modal-subtitle {
          margin-top: 4px;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.5;
        }

        .title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .title-icon svg {
          width: 18px;
          height: 18px;
          color: #fff;
        }

        .modal-close {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }

        .modal-close:hover {
          background: #2a2a3e;
          color: #fff;
        }

        .modal-close svg {
          width: 20px;
          height: 20px;
        }

        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #2a2a3e;
          background: rgba(18, 18, 26, 0.6);
        }

        .tab {
          flex: 1;
          padding: 14px 12px;
          background: none;
          border: none;
          color: #6b7280;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .tab.active {
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
        }

        .modal-form {
          max-height: 62vh;
          overflow-y: auto;
        }

        .tab-content {
          padding: 28px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .label-text {
          display: block;
          color: #e5e7eb;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          background: #0a0a0f;
          border: 1px solid #2a2a3e;
          border-radius: 8px;
          padding: 12px 16px;
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-input:focus,
        .form-textarea:focus,
        .advance-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 96px;
          line-height: 1.5;
        }

        .grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .checkbox-field {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #d1d5db;
          font-size: 13px;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid #2a2a3e;
          border-radius: 10px;
          padding: 14px;
        }

        .info-title {
          color: #818cf8;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .info-body {
          color: #d1d5db;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 28px;
          border-top: 1px solid #2a2a3e;
          background: rgba(26, 26, 46, 0.8);
        }

        .footer-spacer {
          flex: 1;
        }

        .ground-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #070816;
          color: #fff;
        }

        .loading-card,
        .error-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          color: #d1d5db;
        }

        .error-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .back-link {
          color: #a5b4fc;
          text-decoration: none;
        }

        @media (max-width: 1280px) {
          .flow-container {
            display: grid;
            grid-template-columns: 280px 1fr;
          }

          .history-sidebar {
            grid-column: 1 / -1;
            width: auto;
            height: 360px;
            border-left: none;
            border-top: 1px solid #1f1f2e;
          }
        }

        @media (max-width: 840px) {
          .top-bar {
            height: auto;
            padding: 16px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .flow-container {
            display: block;
            overflow: auto;
          }

          .sidebar,
          .history-sidebar {
            width: 100%;
            height: auto;
          }

          .flow-wrapper {
            height: 60vh;
          }

          .grid-two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function GroundPageFallback() {
  return (
    <div className="ground-loading">
      <div className="loading-card">Loading ground...</div>
    </div>
  );
}

export default function GroundPage() {
  return (
    <Suspense fallback={<GroundPageFallback />}>
      <GroundPageContent />
    </Suspense>
  );
}
