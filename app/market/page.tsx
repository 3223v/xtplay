"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  SectionPageItem,
  SectionPageShell,
} from "@/app/components/section-page-shell";
import { werewolfGroundJson, werewolfGroundTemplate } from "@/app/lib/examples/werewolf-ground";

const roleLines = werewolfGroundTemplate.role.map(
  (role) => `${role.name}：${role.description}`,
);

const sections: SectionPageItem[] = [
  {
    id: "overview",
    title: "模板简介",
    summary: "这是一个可直接导入的基础版狼人杀 Ground，用来快速启动隐藏身份模拟。",
    blocks: [
      "模板重点是先搭好角色、目标、昼夜节奏和提示词骨架，而不是一次性把整套桌游规则都写死。",
      "导入后你可以继续在 Ground 中修改角色提示词、规则、批次推进方式和 saint 主持机制。",
      "默认不附带 saint，方便你先手动控制，之后再决定是否加入主持人角色。",
    ],
  },
  {
    id: "roles",
    title: "内置角色",
    summary: "模板自带一组基础身份角色，可直接用于测试多角色社交推理。",
    blocks: roleLines,
  },
  {
    id: "customize",
    title: "导入后优先修改什么",
    summary: "如果你准备真正跑这个场景，建议先修改这些配置。",
    blocks: [
      "补上默认模型、Base URL 和 API Key。",
      "根据节奏调整 batch_size 和 round_goal。",
      "如果你希望系统自己主持和审批，再手动添加 saint。",
      "如果你想更接近真实桌游，再细化夜间技能、投票规则和事件模板。",
    ],
  },
  {
    id: "import",
    title: "导入路径",
    summary: "这个模板支持复制 JSON 或一键导入创建 Ground。",
    blocks: [
      "如果你想先修改内容再导入，就先复制 JSON。",
      "如果你想直接得到一个新的 Ground，就使用一键导入。",
      "导入成功后建议立即打开 Ground，检查模型配置、角色提示词和布局是否符合预期。",
    ],
    code: werewolfGroundJson,
  },
];

function ImportSidebarCard() {
  const router = useRouter();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [importState, setImportState] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [importedGroundId, setImportedGroundId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(werewolfGroundJson);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  async function handleImport() {
    setImportState("loading");
    setImportMessage("");
    setImportedGroundId(null);

    try {
      const response = await fetch("/api/ground/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: werewolfGroundJson,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "导入失败");
      }

      setImportState("success");
      setImportedGroundId(result.data.id as string);
      setImportMessage(`已成功创建 Ground：${result.data.name}`);
    } catch (error) {
      setImportState("failed");
      setImportMessage(error instanceof Error ? error.message : "导入失败");
    }
  }

  return (
    <div className="mt-8 rounded-[28px] border border-white/10 bg-[#0d0f16]/95 p-6 backdrop-blur-xl">
      <div className="text-xs uppercase tracking-[0.28em] text-pink-300">快速操作</div>
      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={handleCopy}
          className="rounded-full border border-pink-300/25 bg-pink-300/10 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:bg-pink-300/15"
        >
          {copyState === "copied"
            ? "已复制"
            : copyState === "failed"
              ? "复制失败"
              : "复制 JSON"}
        </button>
        <button
          onClick={handleImport}
          disabled={importState === "loading"}
          className="rounded-full bg-gradient-to-r from-pink-500 to-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:from-pink-400 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importState === "loading" ? "导入中..." : "一键导入创建 Ground"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-gray-300">
        {importState === "idle" ? "尚未执行导入。" : null}
        {importState === "loading" ? "正在创建狼人杀 Ground..." : null}
        {importState === "failed" ? importMessage || "导入失败。" : null}
        {importState === "success" ? importMessage || "导入成功。" : null}
      </div>

      {importedGroundId ? (
        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={() => router.push(`/ground?g=${importedGroundId}`)}
            className="rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:from-sky-400 hover:to-emerald-400"
          >
            打开新建 Ground
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function Market() {
  return (
    <SectionPageShell
      heroEyebrow="XTPlay Market"
      heroTitle="基础版狼人杀 Ground 模板"
      heroDescription="这里放的是可直接复用的场景模板。当前提供一个基础版狼人杀 Ground，支持复制 JSON 或一键导入。"
      activeNav="market"
      footerLabel="© 2026 XTPlay · 场景 Market"
      sections={sections}
      codeTitle="可导入 JSON"
      heroPanel={<ImportSidebarCard />}
    />
  );
}
