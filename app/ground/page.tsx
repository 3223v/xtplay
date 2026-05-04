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
  RoundRecord,
} from "@/app/lib/sim/types";

import { EventConfig } from "@/app/lib/types";

import ExportMenu from "@/app/components/ExportMenu";

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
    name: `角色 ${ground.role.length + 1}`,
    description: "角色智能体",
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
    workflow: ground.workflow,
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
  const [expanded, setExpanded] = useState(false);
  const badge = data.kind === "saint" ? "SAINT" : data.enabled ? "角色" : "已暂停";
  const runtimeFacts = [
    { label: "状态", value: data.status === "active" ? "活跃" : data.status === "silent" ? "沉默" : "死亡" },
    { label: "类型", value: data.kind },
    { label: "已启用", value: data.enabled ? "是" : "否" },
    { label: "模型", value: data.model || "未设置" },
    { label: "温度", value: String(data.temperature) },
    { label: "冗余", value: String(data.redundancy) },
  ];

  const relationFacts = [
    { label: "屏蔽", value: String(data.blocked_role_names.length) },
    { label: "未知", value: String(data.unknown_role_names.length) },
    { label: "收件箱", value: String(data.inbox.length) },
    { label: "私有", value: String(data.knowledge_private.length) },
    { label: "公共", value: String(data.knowledge_public.length) },
  ];

  return (
    <div
      className={`role-node ${selected ? "selected" : ""} ${data.enabled ? "" : "disabled"} ${data.kind === "saint" ? "saint" : ""}`}
      onDoubleClick={() => data.onEdit(id)}
      title="双击编辑角色"
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
        <div className="role-name">{data.name || "未命名角色"}</div>
        <div className="role-desc">{data.description || "暂无描述。"}</div>
      </div>

      <div className="role-meta role-meta-primary">
        <span className={`status-pill ${getStatusClass(data.status)}`}>{data.status === "active" ? "活跃" : data.status === "silent" ? "沉默" : "死亡"}</span>
        <span>{data.kind}</span>
        <span>冗余 {data.redundancy}</span>
        <span>收件箱 {data.inbox.length}</span>
        <span>{data.enabled ? "已启用" : "已禁用"}</span>
      </div>

      <div className="role-fact-grid">
        {runtimeFacts.slice(0, 4).map((fact) => (
          <div key={fact.label} className="role-fact">
            <span className="role-fact-label">{fact.label}</span>
            <span className="role-fact-value">{fact.value}</span>
          </div>
        ))}
      </div>

      <div className="role-meta role-meta-secondary">
        {relationFacts.map((fact) => (
          <span key={fact.label}>
            {fact.label} {fact.value}
          </span>
        ))}
      </div>

      <div className="role-footer">
        <button
          className="role-expand-toggle nodrag"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((previous) => !previous);
          }}
        >
          {expanded ? "隐藏详情" : "显示详情"}
        </button>
        <span className="edit-hint">双击编辑</span>
      </div>

      {expanded ? (
        <div className="role-details nodrag">
          <details className="detail-group" open>
            <summary>运行时</summary>
            <div className="detail-body">
              <div className="detail-grid">
                {runtimeFacts.map((fact) => (
                  <div key={fact.label} className="detail-grid-item">
                    <span className="detail-grid-label">{fact.label}</span>
                    <span className="detail-grid-value">{fact.value}</span>
                  </div>
                ))}
                <div className="detail-grid-item">
                  <span className="detail-grid-label">URL</span>
                  <span className="detail-grid-value">{data.url || "未设置"}</span>
                </div>
                <div className="detail-grid-item">
                  <span className="detail-grid-label">API 密钥</span>
                  <span className="detail-grid-value">{data.key ? "已配置" : "未设置"}</span>
                </div>
              </div>
            </div>
          </details>

          <details className="detail-group">
            <summary>提示词</summary>
            <div className="detail-body">
              <div className="detail-block">
                <div className="detail-label">使用提示词</div>
                <pre className="detail-pre">{data.use_prompt || "无"}</pre>
              </div>
              <div className="detail-block">
                <div className="detail-label">系统提示词</div>
                <pre className="detail-pre">{data.system_prompt || "无"}</pre>
              </div>
            </div>
          </details>

          <details className="detail-group">
            <summary>知识</summary>
            <div className="detail-body">
              <div className="detail-block">
                <div className="detail-label">私有知识</div>
                <pre className="detail-pre">
                  {data.knowledge_private.length > 0
                    ? data.knowledge_private.join("\n")
                    : "无"}
                </pre>
              </div>
              <div className="detail-block">
                <div className="detail-label">公共知识</div>
                <pre className="detail-pre">
                  {data.knowledge_public.length > 0
                    ? data.knowledge_public.join("\n")
                    : "无"}
                </pre>
              </div>
            </div>
          </details>

          <details className="detail-group">
            <summary>关系</summary>
            <div className="detail-body">
              <div className="detail-block">
                <div className="detail-label">屏蔽角色</div>
                <pre className="detail-pre">
                  {data.blocked_role_names.length > 0
                    ? data.blocked_role_names.join("\n")
                    : "无"}
                </pre>
              </div>
              <div className="detail-block">
                <div className="detail-label">未知角色</div>
                <pre className="detail-pre">
                  {data.unknown_role_names.length > 0
                    ? data.unknown_role_names.join("\n")
                    : "无"}
                </pre>
              </div>
            </div>
          </details>

          <details className="detail-group">
            <summary>收件箱和追踪</summary>
            <div className="detail-body">
              <div className="detail-block">
                <div className="detail-label">收件箱</div>
                <pre className="detail-pre">
                  {data.inbox.length > 0 ? data.inbox.join("\n") : "无"}
                </pre>
              </div>
              <div className="detail-block">
                <div className="detail-label">上次思考</div>
                <pre className="detail-pre">{data.last_think || "无"}</pre>
              </div>
              <div className="detail-block">
                <div className="detail-label">上次错误</div>
                <pre className="detail-pre">{data.last_error || "无"}</pre>
              </div>
            </div>
          </details>
        </div>
      ) : null}
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
  presets: { urls: { value: string; label: string }[]; models: { value: string; label: string }[] };
  onClose: () => void;
  onSave: (role: RoleConfig) => void;
  onDelete: () => void;
}

function RoleEditModal({ role, presets, onClose, onSave, onDelete }: RoleEditModalProps) {
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
              <h3>{isSaint ? "编辑 Saint" : "编辑角色"}</h3>
              <div className="modal-subtitle">
                {isSaint
                  ? "Saint 是特殊的裁决者，无法被删除。"
                  : "配置行为、可见性规则和本地状态。"}
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
            { key: "basic", label: "基本" },
            { key: "prompt", label: "提示词" },
            { key: "api", label: "API" },
            { key: "relations", label: "关系" },
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
                    <span className="label-text">名称</span>
                    <input
                      className="form-input"
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="角色名称"
                      disabled={isSaint}
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">状态</span>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={(event) =>
                        updateField("status", event.target.value as RoleConfig["status"])
                      }
                    >
                      <option value="active">活跃</option>
                      <option value="silent">沉默</option>
                      <option value="dead">死亡</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">描述</span>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="描述此角色"
                  />
                </label>
              </div>

              <div className="grid-two">
                <div className="form-group">
                  <label>
                    <span className="label-text">冗余度</span>
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
                    <span className="label-text">温度</span>
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
                <span>启用此角色参与推进</span>
              </label>
            </div>
          ) : null}

          {activeTab === "prompt" ? (
            <div className="tab-content">
              <div className="form-group">
                <label>
                  <span className="label-text">使用提示词</span>
                  <textarea
                    className="form-textarea"
                    rows={5}
                    value={formData.use_prompt}
                    onChange={(event) => updateField("use_prompt", event.target.value)}
                    placeholder="面向用户的提示词"
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">系统提示词</span>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={formData.system_prompt}
                    onChange={(event) => updateField("system_prompt", event.target.value)}
                    placeholder="角色的系统提示词"
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
                    <span className="label-text">API URL</span>
                    <div className="input-with-select">
                      <select
                        className="form-select"
                        value={presets.urls.find(u => u.value === formData.url) ? formData.url : ""}
                        onChange={(event) => updateField("url", event.target.value)}
                      >
                        <option value="">自定义...</option>
                        {presets.urls.map((url) => (
                          <option key={url.value} value={url.value}>
                            {url.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="form-input"
                        value={formData.url}
                        onChange={(event) => updateField("url", event.target.value)}
                        placeholder="https://api.example.com/v1"
                      />
                    </div>
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">模型</span>
                    <div className="input-with-select">
                      <select
                        className="form-select"
                        value={presets.models.find(m => m.value === formData.model) ? formData.model : ""}
                        onChange={(event) => updateField("model", event.target.value)}
                      >
                        <option value="">Custom...</option>
                        {presets.models.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="form-input"
                        value={formData.model}
                        onChange={(event) => updateField("model", event.target.value)}
                        placeholder="gpt-4.1-mini"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">API 密钥</span>
                  <input
                    className="form-input"
                    type="password"
                    value={formData.key}
                    onChange={(event) => updateField("key", event.target.value)}
                    placeholder="角色级别密钥"
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
                    <span className="label-text">私有知识</span>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={listToText(formData.knowledge_private)}
                      onChange={(event) =>
                        updateField("knowledge_private", textToList(event.target.value))
                      }
                      placeholder="每行一条"
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">公共知识</span>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={listToText(formData.knowledge_public)}
                      onChange={(event) =>
                        updateField("knowledge_public", textToList(event.target.value))
                      }
                      placeholder="每行一条"
                    />
                  </label>
                </div>
              </div>

              <div className="grid-two">
                <div className="form-group">
                  <label>
                    <span className="label-text">屏蔽角色</span>
                    <textarea
                      className="form-textarea"
                      rows={5}
                      value={listToText(formData.blocked_role_names)}
                      onChange={(event) =>
                        updateField("blocked_role_names", textToList(event.target.value))
                      }
                      placeholder="无法接收此角色消息的角色"
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-text">未知角色</span>
                    <textarea
                      className="form-textarea"
                      rows={5}
                      value={listToText(formData.unknown_role_names)}
                      onChange={(event) =>
                        updateField("unknown_role_names", textToList(event.target.value))
                      }
                      placeholder="此角色不知道存在的角色"
                    />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">收件箱</span>
                  <textarea
                    className="form-textarea"
                    rows={7}
                    value={listToText(formData.inbox)}
                    onChange={(event) => updateField("inbox", textToList(event.target.value))}
                    placeholder="每行一条收件箱条目"
                  />
                </label>
              </div>

              <div className="grid-two">
                <div className="info-card">
                  <div className="info-title">上次思考</div>
                  <div className="info-body">
                    {formData.last_think || "此角色尚未执行任何回合。"}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-title">上次错误</div>
                  <div className="info-body">{formData.last_error || "无错误记录。"}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          {!isSaint && (
            <button className="btn btn-danger" onClick={onDelete}>
              删除
            </button>
          )}
          <div className="footer-spacer" />
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(formData)}
            disabled={!formData.name.trim()}
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}

interface GroundSettingsModalProps {
  ground: GroundFile;
  presets: { urls: { value: string; label: string }[]; models: { value: string; label: string }[] };
  onClose: () => void;
  onSave: (patch: Partial<GroundFile>) => void;
}

function GroundSettingsModal({ ground, presets, onClose, onSave }: GroundSettingsModalProps) {
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
              <h3>工作空间设置</h3>
              <div className="modal-subtitle">
                编辑世界规则、默认模型设置和批次配置。
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
                  <span className="label-text">工作空间名称</span>
                  <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">默认模型</span>
                  <div className="input-with-select">
                    <select
                      className="form-select"
                      value={presets.models.find(m => m.value === defaultModel) ? defaultModel : ""}
                      onChange={(event) => setDefaultModel(event.target.value)}
                    >
                      <option value="">自定义...</option>
                      {presets.models.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      value={defaultModel}
                      onChange={(event) => setDefaultModel(event.target.value)}
                      placeholder="输入或选择模型"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>
                <span className="label-text">描述</span>
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
                  <span className="label-text">默认 URL</span>
                  <div className="input-with-select">
                    <select
                      className="form-select"
                      value={presets.urls.find(u => u.value === defaultUrl) ? defaultUrl : ""}
                      onChange={(event) => setDefaultUrl(event.target.value)}
                    >
                      <option value="">自定义...</option>
                      {presets.urls.map((url) => (
                        <option key={url.value} value={url.value}>
                          {url.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      value={defaultUrl}
                      onChange={(event) => setDefaultUrl(event.target.value)}
                      placeholder="输入或选择 URL"
                    />
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">默认密钥</span>
                  <input
                    className="form-input"
                    type="password"
                    value={defaultKey}
                    onChange={(event) => setDefaultKey(event.target.value)}
                    placeholder="API 密钥"
                  />
                </label>
              </div>
            </div>

            <div className="grid-two">
              <div className="form-group">
                <label>
                  <span className="label-text">批次大小</span>
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
                  <span className="label-text">模式</span>
                  <select
                    className="form-input"
                    value={mode}
                    onChange={(event) =>
                      setMode(event.target.value as GroundFile["simulation"]["mode"])
                    }
                  >
                    <option value="auto">自动</option>
                    <option value="live">实时</option>
                    <option value="mock">模拟</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>
                <span className="label-text">回合目标</span>
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
                  <span className="label-text">规则</span>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={rules}
                    onChange={(event) => setRules(event.target.value)}
                    placeholder="每行一条规则"
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-text">公共知识</span>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={knowledge}
                    onChange={(event) => setKnowledge(event.target.value)}
                    placeholder="每行一条"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-spacer" />
          <button className="btn btn-secondary" onClick={onClose}>
            取消
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
            保存设置
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showVoteResults, setShowVoteResults] = useState(false);
  const [roundInstruction, setRoundInstruction] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventPrompt, setEventPrompt] = useState("");
  const [excludedRoleIds, setExcludedRoleIds] = useState<string[]>([]);
  const [manualMode, setManualMode] = useState<"auto" | "manual">("auto");
  const [eventsConfig, setEventsConfig] = useState<EventConfig[]>([]);
  const [presetsConfig, setPresetsConfig] = useState<{ urls: { value: string; label: string }[]; models: { value: string; label: string }[] }>({ urls: [], models: [] });
  const [editablePlanInstructions, setEditablePlanInstructions] = useState("");
  const [editablePlanEvent, setEditablePlanEvent] = useState<{ type: string; title: string; prompt: string } | null>(null);
  const [editablePlanBatchRoleIds, setEditablePlanBatchRoleIds] = useState<string[]>([]);
  const [editablePlanMessageScope, setEditablePlanMessageScope] = useState<"public" | "batch_only">("batch_only");

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
      const sanitizedGround = {
        ...nextGround,
        workflow: {
          ...nextGround.workflow,
          pending_plan: null,
          pending_judgement: null,
        },
      };

      applyGround(sanitizedGround, { dirty: true, localMutation: true });

      if (options?.persist === "immediate") {
        clearAutoSaveTimer();
        void persistGround(sanitizedGround);
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
          throw new Error(result.message || "加载工作空间失败");
        }

        const nextGround = result.data as GroundFile;
        groundRef.current = nextGround;
        localVersionRef.current = 0;
        saveVersionRef.current = 0;
        applyGround(nextGround, { dirty: false });
        setSelectedRoleId(nextGround.role[0]?.id ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "加载工作空间失败");
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

  useEffect(() => {
    async function loadConfig() {
      try {
        const [eventsRes, presetsRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/presets"),
        ]);
        const eventsResult = await eventsRes.json();
        const presetsResult = await presetsRes.json();
        if (eventsResult.success) {
          setEventsConfig(eventsResult.data);
        }
        if (presetsResult.success) {
          setPresetsConfig(presetsResult.data);
        }
      } catch {
        // ignore
      }
    }
    void loadConfig();
  }, []);

  const editingRole = useMemo(
    () => ground?.role.find((role) => role.id === editingRoleId) ?? null,
    [editingRoleId, ground],
  );

  const rounds = useMemo<RoundRecord[]>(() => ground?.round ?? [], [ground]);

  const handleUndoRound = useCallback(async () => {
    if (!ground || ground.round.length === 0) {
      return;
    }

    try {
      const response = await fetch(`/api/ground?id=${groundId}&action=undo`, {
        method: "PATCH",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          applyGround(result.data, { dirty: false });
        }
      }
    } catch (error) {
      console.error("撤销回合失败:", error);
    }
  }, [applyGround, ground, groundId]);

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

  const pendingPlan = ground?.workflow.pending_plan ?? null;
  const pendingJudgement = ground?.workflow.pending_judgement ?? null;

  useEffect(() => {
    if (pendingPlan) {
      setEditablePlanInstructions(pendingPlan.instructions || "");
      setEditablePlanEvent(pendingPlan.event ? { type: pendingPlan.event.type, title: pendingPlan.event.title, prompt: pendingPlan.event.prompt } : null);
      setEditablePlanMessageScope(pendingPlan.message_scope || "batch_only");
      if (ground && pendingPlan.batch_role_names.length > 0) {
        const ids = ground.role
          .filter(role => pendingPlan.batch_role_names.includes(role.name))
          .map(role => role.id);
        setEditablePlanBatchRoleIds(ids);
      } else {
        setEditablePlanBatchRoleIds([]);
      }
    }
  }, [pendingPlan, ground]);

  const defaultUpcomingBatch = useMemo(() => {
    if (!ground) {
      return [];
    }
    return getBatchRoles(ground);
  }, [ground]);
  const plannedBatchRoles = useMemo(() => {
    if (!ground || !pendingPlan) {
      return [];
    }

    return ground.role.filter((role) => pendingPlan.batch_role_names.includes(role.name));
  }, [ground, pendingPlan]);

  const latestRoundWithEvent = useMemo(
    () => [...rounds].reverse().find((round) => round.event) ?? null,
    [rounds],
  );

  async function toggleSaintRole() {
    if (!ground) return;

    try {
      const response = await fetch(`/api/saint/toggle?groundId=${ground.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        const updatedGround = result.data as GroundFile;
        groundRef.current = updatedGround;
        applyGround(updatedGround, { dirty: false });
      } else {
        setError(result.message || "切换 Saint 角色失败");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "切换 Saint 角色失败");
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
          setIsAdvancing(false);
          return;
        }

        readyGround = persisted;
      }

      const event =
        !selectedEventType
          ? null
          : {
              type: selectedEventType,
              title: eventTitle.trim() || "Custom Event",
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
        throw new Error(result.message || "推进回合失败");
      }

      const nextGround = result.ground as GroundFile;
      groundRef.current = nextGround;
      localVersionRef.current += 1;
      saveVersionRef.current = localVersionRef.current;
      applyGround(nextGround, { dirty: false });
      setRoundInstruction("");
      setEventTitle("");
      setEventPrompt("");
      setSelectedEventType("");
    } catch (advanceError) {
      setError(
        advanceError instanceof Error ? advanceError.message : "推进回合失败",
      );
    } finally {
      setIsAdvancing(false);
    }
  }

  async function runSaintWorkflowAction(
    action:
      | "propose_plan"
      | "approve_plan"
      | "reject_plan"
      | "approve_judgement"
      | "reject_judgement",
  ) {
    const currentGround = groundRef.current;

    if (!currentGround) {
      return;
    }

    setIsAdvancing(true);
    setError(null);

    try {
      if (dirty) {
        const persisted = await persistGround(currentGround);

        if (!persisted) {
          return;
        }
      }

      const requestBody: Record<string, unknown> = { action };

      if (action === "approve_plan") {
        requestBody.editedPlan = {
          instructions: editablePlanInstructions || undefined,
          event: editablePlanEvent || null,
          batchRoleIds: editablePlanBatchRoleIds.length > 0 ? editablePlanBatchRoleIds : undefined,
          messageScope: editablePlanMessageScope,
        };
      }

      const response = await fetch(`/api/saint?groundId=${currentGround.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "处理 Saint 操作失败");
      }

      const updatedGround = result.ground as GroundFile;
      groundRef.current = updatedGround;
      localVersionRef.current += 1;
      saveVersionRef.current = localVersionRef.current;
      applyGround(updatedGround, { dirty: false });
    } catch (saintError) {
      setError(
        saintError instanceof Error ? saintError.message : "处理 Saint 操作失败",
      );
    } finally {
      setIsAdvancing(false);
    }
  }

  function renderRecentVoteResults() {
    if (!ground || rounds.length === 0) {
      return (
        <div className="vote-results-card">
          <div className="vote-results-title">最近投票结果</div>
          <div className="vote-results-empty">未找到投票历史。</div>
        </div>
      );
    }

    // Find the most recent round with votes
    const recentRoundWithVotes = [...rounds].reverse().find(round => round.votes && round.votes.length > 0);
    
    if (!recentRoundWithVotes) {
      return (
        <div className="vote-results-card">
          <div className="vote-results-title">最近投票结果</div>
          <div className="vote-results-empty">在任何回合中均未找到投票。</div>
        </div>
      );
    }

    // Count votes
    const voteCount = new Map<string, number>();
    recentRoundWithVotes.votes.forEach(vote => {
      voteCount.set(vote.role, (voteCount.get(vote.role) || 0) + vote.vote);
    });

    // Sort by vote count (descending)
    const sortedVotes = Array.from(voteCount.entries())
      .sort((a, b) => b[1] - a[1]);

      return (
        <div className="vote-results-card">
          <div className="vote-results-title">
            Vote Results - Round {recentRoundWithVotes.round}
          </div>
          <div className="vote-results-content">
            {sortedVotes.map(([role, count], index) => (
              <div key={role} className={`vote-result-item ${index === 0 ? "winner" : ""}`}>
                <span className="vote-result-role">{role}</span>
                <span className="vote-result-count">{count} votes</span>
              </div>
            ))}
          </div>
          {recentRoundWithVotes.event && (
            <div className="vote-results-event">
              Event: {recentRoundWithVotes.event.type} - {recentRoundWithVotes.event.title}
            </div>
          )}
        </div>
      );
  }

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
        throw new Error(result.message || "保存工作空间失败");
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
      setError(saveError instanceof Error ? saveError.message : "保存工作空间失败");
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

    const nextRoles = currentGround.role.filter((role) => role.id !== roleId);
    mutateGround((current) => ({
      ...current,
      role: current.role.filter((role) => role.id !== roleId),
    }), { persist: "immediate" });
    setEditingRoleId(null);
    setSelectedRoleId(nextRoles[0]?.id ?? null);
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
        <div className="loading-card">正在加载工作空间...</div>
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="ground-loading">
        <div className="error-card">
          <div>{error || "加载工作空间失败。"}</div>
          <Link href="/manage" className="back-link">
            返回管理页面
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
            工作空间
          </Link>
          <span className="crumb-separator">/</span>
          <span className="crumb current">{ground.name}</span>
        </div>

        <div className="top-actions">
          <span className={`sync-badge ${dirty ? "dirty" : "clean"}`}>
            {dirty ? "未保存的更改" : "已同步"}
          </span>
          <button
            onClick={() => void toggleSaintRole()}
            className={`btn ${saintRole ? "btn-warning" : "btn-success"}`}
            disabled={isSaving || isAdvancing}
          >
            {saintRole ? "移除 Saint 主机" : "添加 Saint 主机"}
          </button>
          {saintRole ? (
            <button
              onClick={() => openRoleEditor(saintRole.id)}
              className="btn btn-secondary"
              disabled={isSaving || isAdvancing}
            >
              查看 Saint
            </button>
          ) : null}
          <button
            onClick={() => setShowGroundSettings(true)}
            className="btn btn-secondary"
            disabled={isSaving || isAdvancing}
          >
            工作空间设置
          </button>
          <ExportMenu
            groundId={ground.id}
            groundName={ground.name}
            getGroundJson={() => JSON.stringify(ground, null, 2)}
            onCopyJson={(json) => {
              navigator.clipboard.writeText(json);
            }}
            onExportToMarket={async (title, description) => {
              try {
                const response = await fetch("/api/market", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title,
                    description,
                    text: `XTPlay Ground 场景: ${ground.name}`,
                    jsonContent: JSON.stringify(ground, null, 2),
                    tags: ["ground", "场景"],
                  }),
                });
                if (response.ok) {
                  alert("成功导出到市场！");
                } else {
                  alert("导出到市场失败");
                }
              } catch {
                alert("导出到市场失败");
              }
            }}
          />
          <button
            onClick={() => void persistGround()}
            className="btn btn-secondary"
            disabled={isSaving || isAdvancing}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={handleUndoRound}
            className="btn btn-secondary"
            disabled={isSaving || isAdvancing || !ground || ground.round.length === 0}
            title="撤销上一回合"
          >
            ↩ 撤销回合
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
            <div className="section-title">组件</div>

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
                <span className="item-label">角色</span>
                <span className="item-desc">拖到画布创建角色节点。</span>
              </div>
            </div>

            <button className="sidebar-add" onClick={() => addRole()}>
              直接添加角色
            </button>

            <div className="section-title section-space">角色顺序</div>
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
            <p className="hint-text">将角色拖入画布，双击可编辑。</p>
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
            <Background gap={20} size={1} color="#e2e8f0" />
            <Controls className="flow-controls" />
            <MiniMap className="flow-minimap" nodeColor="#3b82f6" maskColor="rgba(226, 232, 240, 0.8)" />
          </ReactFlow>

          {error ? <div className="floating-error">{error}</div> : null}
        </div>

        <aside className="history-sidebar">
          <div className="history-header">
            <h3>推进与历史</h3>
            <span className="round-count">{rounds.length}</span>
          </div>

          <div className="history-content">
            <div className="advance-card">
              <div className="advance-title">
                  推进控制
                  <button
                    onClick={() => setShowVoteResults(!showVoteResults)}
                    className="vote-results-toggle"
                  >
                    {showVoteResults ? "隐藏投票" : "显示投票"}
                  </button>
                </div>

              <div className="mode-toggle">
                <button
                  className={`mode-btn ${manualMode === "auto" ? "active" : ""}`}
                  onClick={() => setManualMode("auto")}
                >
                  自动 (Saint)
                </button>
                <button
                  className={`mode-btn ${manualMode === "manual" ? "active" : ""}`}
                  onClick={() => setManualMode("manual")}
                >
                  手动
                </button>
              </div>

              {showVoteResults && renderRecentVoteResults()}

              {manualMode === "manual" ? (
                <div className="manual-advance-panel">
                  <div className="manual-section">
                    <div className="manual-section-title">手动推进</div>
                    <div className="manual-section-desc">
                      参与者:{" "}
                      {upcomingParticipants.length > 0
                        ? upcomingParticipants.map((role) => role.name).join(", ")
                        : "无"}
                    </div>
                    <textarea
                      className="advance-input"
                      rows={3}
                      value={roundInstruction}
                      onChange={(event) => setRoundInstruction(event.target.value)}
                      placeholder="为下一步输入可选指令"
                    />
                    <div className="advance-meta">
                      <span>模式: {ground.simulation.mode}</span>
                      <span>批次大小: {ground.simulation.batch_size}</span>
                    </div>
                    <button
                      onClick={() => void advanceRound()}
                      className="advance-button"
                      disabled={
                        isSaving || isAdvancing || upcomingParticipants.length === 0
                      }
                    >
                      {isAdvancing ? "推进中..." : "推进"}
                    </button>
                  </div>

                  <div className="manual-section">
                    <div className="manual-section-title">注入事件</div>
                    <div className="manual-section-desc">
                      选择一个事件注入到下一步中。
                    </div>
                    <div className="event-card-grid">
                      {eventsConfig.length === 0 ? (
                        <div className="event-empty-hint">
                          未配置事件。请在 config.json 中添加。
                        </div>
                      ) : (
                        eventsConfig.map((evt) => (
                          <div
                            key={evt.type}
                            className={`event-inject-card ${evt.accentClass} ${
                              selectedEventType === evt.type ? "selected" : ""
                            }`}
                            onClick={() => {
                              if (selectedEventType === evt.type) {
                                setSelectedEventType("");
                              } else {
                                setSelectedEventType(evt.type);
                                setEventPrompt(evt.defaultPrompt);
                                setEventTitle(evt.title);
                              }
                            }}
                          >
                            <div className="event-inject-label">{evt.shortLabel}</div>
                            <div className="event-inject-title">{evt.title}</div>
                            <div className="event-inject-desc">{evt.description}</div>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedEventType && (
                      <div className="event-config-detail">
                        <input
                          type="text"
                          className="advance-input"
                          placeholder="事件标题（可选）"
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                        />
                        <textarea
                          className="advance-input"
                          rows={3}
                          value={eventPrompt}
                          onChange={(e) => setEventPrompt(e.target.value)}
                          placeholder="事件提示词"
                        />
                        <button
                          className="clear-event-btn"
                          onClick={() => {
                            setSelectedEventType("");
                            setEventTitle("");
                            setEventPrompt("");
                          }}
                        >
                        清除事件
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="manual-section">
                    <div className="manual-section-title">从下一步中排除</div>
                    <div className="manual-section-desc">
                      被排除的角色将不参与。
                    </div>
                    <div className="exclude-list">
                      {ground.role
                        .filter(
                          (role) =>
                            role.enabled &&
                            role.status !== "dead" &&
                            !isSaintRole(role),
                        )
                        .map((role) => (
                          <label key={role.id} className="exclude-row">
                            <input
                              type="checkbox"
                              checked={excludedRoleIds.includes(role.id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setExcludedRoleIds((prev) => [...prev, role.id]);
                                } else {
                                  setExcludedRoleIds((prev) =>
                                    prev.filter((id) => id !== role.id),
                                  );
                                }
                              }}
                            />
                            <span>
                              {role.name} ({role.status})
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="advance-subtitle">
                    {saintRole
                      ? "Saint 会提议下一步主持人操作，每个提案在执行前需要您批准。"
                      : "添加 saint 让 LLM 主机替换手动操作输入。"}
                  </div>

                  {!saintRole ? (
                    <div className="host-empty-card">
                      <div className="host-empty-title">没有 Saint 主机</div>
                      <div className="host-empty-body">
                        添加 saint 让 LLM 主机选择指令、事件、行动角色和回合后状态变更。
                      </div>
                      <button
                        onClick={() => void toggleSaintRole()}
                        className="advance-button"
                        disabled={isSaving || isAdvancing}
                      >
                        添加 Saint 主机
                      </button>
                    </div>
                  ) : null}

                  {saintRole && !pendingPlan ? (
                    <div className="host-empty-card">
                      <div className="host-empty-title">没有待处理的主机计划</div>
                      <div className="host-empty-body">
                        Saint 将检查当前场景并提出下一步骤供您批准。
                      </div>
                      <div className="event-option-grid">
                        <div className="event-option-card active custom">
                          <span className="event-option-title">默认批次</span>
                          <span className="event-option-desc">
                            如果 saint 需要后备，默认下一批次是{" "}
                            {defaultUpcomingBatch.map((role) => role.name).join(", ") ||
                              "无"}
                            。
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => void runSaintWorkflowAction("propose_plan")}
                        className="advance-button"
                        disabled={isSaving || isAdvancing}
                      >
                        {isAdvancing ? "思考中..." : "请求 Saint 下一步操作"}
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              {pendingPlan && manualMode === "auto" ? (
                <div className="event-preview-card">
                  <div className="event-preview-header">
                    <span
                      className={`event-preview-badge ${
                        pendingPlan.event
                          ? eventsConfig.find(e => e.type === pendingPlan.event!.type)?.accentClass || "neutral"
                          : "neutral"
                      }`}
                    >
                      plan
                    </span>
                    <span className="event-preview-title">
                      {pendingPlan.summary || "Saint proposed the next step."}
                    </span>
                  </div>

                  <div className="event-preview-body">
                    {pendingPlan.reasoning || "未提供推理。"}
                  </div>

                  <div className="detail-block">
                    <div className="detail-label">主持人指令</div>
                    <textarea
                      className="detail-textarea"
                      rows={2}
                      defaultValue={pendingPlan.instructions || ""}
                      onChange={(e) => setEditablePlanInstructions(e.target.value)}
                      placeholder="输入主持人指令..."
                    />
                  </div>

                  <div className="detail-block">
                    <div className="detail-label">选择角色</div>
                    <div className="batch-role-grid">
                      {ground.role
                        .filter(role => role.kind !== "saint" && role.enabled && role.status !== "dead")
                        .map(role => (
                          <label key={role.id} className={`batch-role-item ${editablePlanBatchRoleIds.includes(role.id) ? "selected" : ""}`}>
                            <input
                              type="checkbox"
                              checked={editablePlanBatchRoleIds.includes(role.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditablePlanBatchRoleIds(prev => [...prev, role.id]);
                                } else {
                                  setEditablePlanBatchRoleIds(prev => prev.filter(id => id !== role.id));
                                }
                              }}
                            />
                            <span>{role.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  <div className="detail-block">
                    <div className="detail-label">消息范围</div>
                    <div className="message-scope-toggle">
                      <button
                        type="button"
                        className={`scope-btn ${editablePlanMessageScope === "public" ? "active" : ""}`}
                        onClick={() => setEditablePlanMessageScope("public")}
                      >
                        公开
                      </button>
                      <button
                        type="button"
                        className={`scope-btn ${editablePlanMessageScope === "batch_only" ? "active" : ""}`}
                        onClick={() => setEditablePlanMessageScope("batch_only")}
                      >
                        仅批次
                      </button>
                    </div>
                  </div>

                  <div className="detail-block">
                    <div className="detail-label">事件</div>
                    <select
                      className="detail-select"
                      value={editablePlanEvent?.type || ""}
                      onChange={(e) => {
                        const evt = eventsConfig.find(ev => ev.type === e.target.value);
                        if (evt) {
                          setEditablePlanEvent({ type: evt.type, title: evt.title, prompt: evt.defaultPrompt });
                        } else {
                          setEditablePlanEvent(null);
                        }
                      }}
                    >
                      <option value="">none</option>
                      {eventsConfig.map(evt => (
                        <option key={evt.type} value={evt.type}>{evt.title}</option>
                      ))}
                    </select>
                    {editablePlanEvent && (
                      <>
                        <input
                          type="text"
                          className="detail-input"
                          placeholder="事件标题"
                          defaultValue={editablePlanEvent.title}
                          onChange={(e) => setEditablePlanEvent({ ...editablePlanEvent, title: e.target.value })}
                          style={{ marginTop: 8 }}
                        />
                        <textarea
                          className="detail-textarea"
                          rows={2}
                          placeholder="事件提示词"
                          defaultValue={editablePlanEvent.prompt}
                          onChange={(e) => setEditablePlanEvent({ ...editablePlanEvent, prompt: e.target.value })}
                          style={{ marginTop: 8 }}
                        />
                      </>
                    )}
                  </div>

                  <div className="approval-actions">
                    <button
                      onClick={() => void runSaintWorkflowAction("reject_plan")}
                      className="btn btn-secondary"
                      disabled={isSaving || isAdvancing}
                    >
                      拒绝计划
                    </button>
                    <button
                      onClick={() => void runSaintWorkflowAction("approve_plan")}
                      className="btn btn-primary"
                      disabled={isSaving || isAdvancing}
                    >
                      批准并执行
                    </button>
                  </div>
                </div>
              ) : null}

              {pendingJudgement && manualMode === "auto" ? (
                <div className="latest-event-card">
                  <div className="latest-event-title">待处理Saint裁决</div>
                  <div className="latest-event-line">
                    回合 {pendingJudgement.round} -{" "}
                    {pendingJudgement.summary || "无摘要"}
                  </div>
                  <div className="latest-event-line subtle">
                    {pendingJudgement.reasoning || "未提供推理。"}
                  </div>

                  <div className="judgement-list">
                    {pendingJudgement.role_updates.length > 0 ? (
                      pendingJudgement.role_updates.map((patch, index) => (
                        <div key={`${patch.role}-${index}`} className="judgement-item">
                          <div className="judgement-role">{patch.role}</div>
                          <div className="judgement-reason">{patch.reason}</div>
                          <div className="judgement-tags">
                            {patch.status ? (
                              <span className="judgement-tag">
                                status {patch.status}
                              </span>
                            ) : null}
                            {typeof patch.redundancy === "number" ? (
                              <span className="judgement-tag">
                                red {patch.redundancy}
                              </span>
                            ) : null}
                            {typeof patch.enabled === "boolean" ? (
                              <span className="judgement-tag">
                                {patch.enabled ? "enabled" : "disabled"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="vote-results-empty">
                        saint proposed no state changes.
                      </div>
                    )}
                  </div>

                  <div className="approval-actions">
                    <button
                      onClick={() => void runSaintWorkflowAction("reject_judgement")}
                      className="btn btn-secondary"
                      disabled={isSaving || isAdvancing}
                    >
                      拒绝裁决
                    </button>
                    <button
                      onClick={() => void runSaintWorkflowAction("approve_judgement")}
                      className="btn btn-primary"
                      disabled={isSaving || isAdvancing}
                    >
                      批准更改
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="world-card">
              <div className="advance-title">世界摘要</div>
              <div className="world-line">规则: {ground.rule.length}</div>
              <div className="world-line">公共知识: {ground.knowledge.length}</div>
              <div className="world-line">
                启用角色: {ground.role.filter((role) => role.enabled).length} / {ground.role.length}
              </div>
            </div>

            {rounds.length > 0 ? (
              [...rounds].reverse().map((round) => (
                <div key={`${round.round}-${round.createdAt}`} className="round-item">
                  <div className="round-header">
                    <span className="round-number">回合 {round.round}</span>
                    <span className="round-time">{formatRoundTime(round.createdAt)}</span>
                  </div>
                  {round.event ? (
                    <div className="round-event">
                      事件: {round.event.type} / {round.event.title}
                    </div>
                  ) : null}
                  <div className="round-summary">{round.summary || "暂无摘要。"}</div>
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
                      <div className="message empty">本回合无投递消息。</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-history">
                <p>暂无回合历史。</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showGroundSettings ? (
        <GroundSettingsModal
          ground={ground}
          presets={presetsConfig}
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
          presets={presetsConfig}
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
          background: #f1f5f9;
          color: #1e293b;
        }

        .top-bar {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .brand-block {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .crumb {
          color: #3b82f6;
          text-decoration: none;
        }

        .crumb.current {
          color: #1e293b;
        }

        .crumb-separator {
          color: #94a3b8;
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
          color: #059669;
          background: #d1fae5;
          border: 1px solid #a7f3d0;
        }

        .sync-badge.dirty {
          color: #d97706;
          background: #fef3c7;
          border: 1px solid #fde68a;
        }

        .flow-container {
          display: flex;
          flex: 1;
          min-height: 0;
          background: #f1f5f9;
        }

        .sidebar {
          width: 300px;
          height: 100%;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header,
        .history-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-header h3,
        .history-header h3 {
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .component-count,
        .round-count {
          background: #3b82f6;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .round-count {
          background: #059669;
        }

        .sidebar-content {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }

        .section-title {
          color: #64748b;
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
          background: #ffffff;
          border-radius: 10px;
          cursor: grab;
          border: 1px solid #e2e8f0;
          transition: all 0.25s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .draggable-item:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .item-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
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
          color: #1e293b;
          font-size: 14px;
          font-weight: 500;
        }

        .item-desc {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .sidebar-add {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          background: #ffffff;
          color: #64748b;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sidebar-add:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f8fafc;
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
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .role-list-item.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
        }

        .role-list-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .role-index {
          color: #3b82f6;
          font-size: 11px;
          font-weight: 700;
        }

        .role-list-text {
          min-width: 0;
        }

        .role-list-name {
          color: #1e293b;
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
          background: #fef3c7;
          color: #d97706;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .role-list-status {
          color: #64748b;
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
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .hint-text {
          color: #94a3b8;
          font-size: 11px;
          text-align: center;
        }

        .flow-wrapper {
          position: relative;
          flex: 1;
          height: 100%;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .history-sidebar {
          width: 360px;
          height: 100%;
          background: #ffffff;
          border-left: 1px solid #e2e8f0;
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
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .advance-title {
          color: #1e293b;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .vote-results-toggle {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .vote-results-toggle:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .mode-toggle {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          margin-bottom: 12px;
        }

        .mode-btn {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .mode-btn.active {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          border-color: #3b82f6;
          color: #ffffff;
        }

        .manual-advance-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 12px;
        }

        .manual-section {
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }

        .manual-section-title {
          color: #1e293b;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .manual-section-desc {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 10px;
          line-height: 1.5;
        }

        .manual-section .advance-input {
          margin-top: 8px;
        }

        .select-input {
          resize: none;
        }

        .event-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .event-inject-card {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .event-inject-card:hover {
          border-color: #3b82f6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .event-inject-card.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .event-inject-card.dark { border-left: 3px solid #6366f1; }
        .event-inject-card.info { border-left: 3px solid #38bdf8; }
        .event-inject-card.danger { border-left: 3px solid #ef4444; }
        .event-inject-card.neutral { border-left: 3px solid #9ca3af; }
        .event-inject-card.success { border-left: 3px solid #22c55e; }

        .event-inject-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 4px;
        }

        .event-inject-title {
          color: #1e293b;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .event-inject-desc {
          color: #64748b;
          font-size: 11px;
          line-height: 1.4;
        }

        .event-empty-hint {
          grid-column: 1 / -1;
          color: #94a3b8;
          font-size: 12px;
          text-align: center;
          padding: 20px;
        }

        .event-config-detail {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .event-config-detail .advance-input {
          resize: none;
        }

        .clear-event-btn {
          align-self: flex-end;
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #64748b;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-event-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .exclude-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
          max-height: 160px;
          overflow-y: auto;
        }

        .exclude-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1e293b;
          font-size: 12px;
          cursor: pointer;
        }

        .exclude-row input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #3b82f6;
        }

        .vote-results-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin: 12px 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .vote-results-title {
          color: #6366f1;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .vote-results-empty {
          color: #666;
          font-size: 12px;
          text-align: center;
          padding: 10px;
        }

        .vote-results-content {
          margin-bottom: 10px;
        }

        .vote-result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .vote-result-item:last-child {
          border-bottom: none;
        }

        .vote-result-item.winner .vote-result-role,
        .vote-result-item.winner .vote-result-count {
          color: #d97706;
          font-weight: 600;
        }

        .vote-result-role {
          color: #1e293b;
          font-size: 12px;
        }

        .vote-result-count {
          color: #059669;
          font-size: 12px;
          font-weight: 600;
        }

        .vote-results-event {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 11px;
        }

        .event-option-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .event-option-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #1e293b;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .event-option-card:hover {
          border-color: #3b82f6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .event-option-card.active.neutral {
          border-color: #64748b;
          background: #f1f5f9;
        }

        .event-option-card.active.custom {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .event-option-card.active.danger {
          border-color: #f59e0b;
          background: #fef3c7;
        }

        .event-option-title {
          color: #1e293b;
          font-size: 12px;
          font-weight: 600;
        }

        .event-option-desc {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .event-preview-card,
        .latest-event-card {
          margin-top: 12px;
          padding: 16px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .event-preview-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-preview-badge {
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: #f1f5f9;
          color: #64748b;
        }

        .event-preview-badge.custom {
          background: #dbeafe;
          color: #3b82f6;
        }

        .event-preview-badge.danger {
          background: #fef3c7;
          color: #d97706;
        }

        .event-preview-title,
        .latest-event-title {
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
        }

        .event-preview-body {
          margin-top: 10px;
          color: #475569;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .event-preview-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          color: #64748b;
          font-size: 11px;
          flex-wrap: wrap;
        }

        .latest-event-line {
          margin-top: 6px;
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
        }

        .latest-event-line.subtle {
          color: #64748b;
          font-size: 12px;
        }

        .host-empty-card {
          margin-top: 12px;
          padding: 16px;
          border-radius: 12px;
          border: 1px dashed #94a3b8;
          background: #f8fafc;
        }

        .host-empty-title {
          color: #1e293b;
          font-size: 13px;
          font-weight: 600;
        }

        .host-empty-body {
          margin-top: 8px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .approval-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .judgement-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
        }

        .judgement-item {
          padding: 12px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .judgement-role {
          color: #1e293b;
          font-size: 13px;
          font-weight: 600;
        }

        .judgement-reason {
          margin-top: 6px;
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
        }

        .judgement-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .judgement-tag {
          padding: 3px 8px;
          border-radius: 999px;
          background: #eff6ff;
          color: #3b82f6;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .advance-subtitle,
        .world-line {
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          margin-top: 6px;
        }

        .advance-input {
          width: 100%;
          margin-top: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          color: #1e293b;
          font-size: 12px;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .advance-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .select-input {
          resize: none;
        }

        .advance-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          color: #64748b;
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
          color: #1e293b;
          font-size: 12px;
        }

        .round-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .round-number {
          color: #6366f1;
          font-size: 12px;
          font-weight: 700;
        }

        .round-time {
          color: #64748b;
          font-size: 11px;
        }

        .round-event {
          margin-top: 8px;
          color: #d97706;
          font-size: 11px;
        }

        .round-summary {
          margin-top: 8px;
          color: #475569;
          font-size: 13px;
          line-height: 1.6;
        }

        .round-output {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .message {
          font-size: 13px;
          line-height: 1.5;
        }

        .message-role {
          color: #10b981;
          font-weight: 600;
          margin-right: 6px;
        }

        .message-content {
          color: #475569;
        }

        .message.empty {
          color: #64748b;
        }

        .empty-history {
          padding: 18px;
          color: #94a3b8;
          font-size: 12px;
          border: 1px dashed #e2e8f0;
          border-radius: 10px;
          text-align: center;
          background: #f8fafc;
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

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
        }

        .btn-success:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .btn-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
        }

        .btn-warning:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1e293b;
        }

        .btn-danger {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .btn-disabled {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
        }

        .role-node {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0;
          min-width: 220px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
          overflow: hidden;
          transition: all 0.2s;
        }

        .role-node.saint {
          border-color: #f59e0b;
          box-shadow: 0 4px 24px rgba(245, 158, 11, 0.22);
        }

        .role-node:hover {
          border-color: #3b82f6;
          box-shadow: 0 6px 30px rgba(59, 130, 246, 0.25);
        }

        .role-node.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        .role-node.disabled {
          opacity: 0.72;
        }

        .role-header {
          background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%);
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
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
        }

        .role-desc {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .role-meta {
          display: flex;
          gap: 8px;
          padding: 0 14px 8px;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          flex-wrap: wrap;
        }

        .role-meta-primary {
          padding-top: 2px;
        }

        .role-meta-secondary {
          padding-top: 0;
          color: #94a3b8;
        }

        .role-fact-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 0 14px 10px;
        }

        .role-fact {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 8px 10px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          min-width: 0;
        }

        .role-fact-label {
          color: #64748b;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .role-fact-value {
          color: #1e293b;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-pill {
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .status-pill.active {
          background: rgba(16, 185, 129, 0.1);
          color: #16a34a;
        }

        .status-pill.silent {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .status-pill.dead {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .role-footer {
          padding: 8px 14px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .edit-hint {
          color: #94a3b8;
          font-size: 10px;
        }

        .role-expand-toggle {
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .role-expand-toggle:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .role-details {
          padding: 0 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .detail-group {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          overflow: hidden;
        }

        .detail-group summary {
          list-style: none;
          cursor: pointer;
          padding: 10px 12px;
          color: #1e293b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: #f1f5f9;
        }

        .detail-group summary::-webkit-details-marker {
          display: none;
        }

        .detail-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .detail-grid-item {
          min-width: 0;
        }

        .detail-grid-label,
        .detail-label {
          display: block;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 5px;
        }

        .detail-grid-value {
          display: block;
          color: #1e293b;
          font-size: 12px;
          line-height: 1.5;
          word-break: break-word;
        }

        .detail-block {
          min-width: 0;
        }

        .detail-pre {
          margin: 0;
          padding: 10px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          font-size: 11px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 180px;
          overflow: auto;
        }

        .detail-textarea {
          width: 100%;
          margin: 0;
          padding: 10px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          font-size: 12px;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
        }

        .detail-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .detail-input {
          width: 100%;
          margin: 0;
          padding: 8px 12px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          font-size: 12px;
        }

        .detail-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .detail-select {
          width: 100%;
          margin: 0;
          padding: 8px 12px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          font-size: 12px;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }

        .detail-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .batch-role-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin-top: 6px;
        }

        .batch-role-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          font-size: 12px;
          color: #64748b;
          transition: all 0.2s;
        }

        .batch-role-item:hover {
          border-color: #cbd5e1;
          color: #1e293b;
        }

        .batch-role-item.selected {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1e293b;
        }

        .batch-role-item input[type="checkbox"] {
          width: 14px;
          height: 14px;
          accent-color: #3b82f6;
        }

        .message-scope-toggle {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }

        .scope-btn {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scope-btn:hover {
          border-color: #cbd5e1;
          color: #1e293b;
        }

        .scope-btn.active {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1e293b;
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
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          width: min(640px, 92vw);
          max-height: 88vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-wide {
          width: min(900px, 94vw);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-title h3 {
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .modal-subtitle {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
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
          background: #f1f5f9;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }

        .modal-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .modal-close svg {
          width: 20px;
          height: 20px;
        }

        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .tab {
          flex: 1;
          padding: 14px 12px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .tab.active {
          color: #3b82f6;
          background: #eff6ff;
          border-bottom: 2px solid #3b82f6;
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
          color: #374151;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          color: #1e293b;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-input:focus,
        .form-textarea:focus,
        .advance-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

        .input-with-select {
          display: flex;
          gap: 8px;
        }

        .input-with-select .form-select {
          width: 140px;
          flex-shrink: 0;
        }

        .input-with-select .form-input {
          flex: 1;
          min-width: 0;
        }

        .form-select {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          color: #1e293b;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }

        .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .checkbox-field {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #d1d5db;
          font-size: 13px;
        }

        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
        }

        .info-title {
          color: #3b82f6;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .info-body {
          color: #1e293b;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 28px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .footer-spacer {
          flex: 1;
        }

        .ground-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #1e293b;
        }

        .loading-card,
        .error-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 24px;
          color: #1e293b;
        }

        .error-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .back-link {
          color: #3b82f6;
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
            border-top: 1px solid #e2e8f0;
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

          .event-option-grid {
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
