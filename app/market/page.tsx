"use client";

import { useEffect, useState } from "react";

import { MarketArticle } from "@/app/lib/market/types";

interface ArticleCardProps {
  article: MarketArticle;
  onEdit: (article: MarketArticle) => void;
  onDelete: (articleId: string) => void;
  onCopyJson: (article: MarketArticle) => void;
}

function ArticleCard({ article, onEdit, onDelete, onCopyJson }: ArticleCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const handleCopyJson = () => {
    onCopyJson(article);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-emerald-400/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{article.title}</h3>
          {article.description && (
            <p className="mt-1 text-sm text-gray-400">{article.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(article)}
            className="rounded-lg border border-[#2a2a3e] p-2 text-gray-400 transition-colors hover:border-sky-400/50 hover:text-sky-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(article.id)}
            className="rounded-lg border border-[#2a2a3e] p-2 text-gray-400 transition-colors hover:border-red-400/50 hover:text-red-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">文字内容</div>
        <p className="text-sm leading-relaxed text-gray-300 line-clamp-3">
          {article.text || "暂无文字内容"}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">JSON 内容</div>
          <button
            onClick={handleCopyJson}
            className="rounded-lg bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20"
          >
            {copyState === "copied" ? "已复制" : "复制 JSON"}
          </button>
        </div>
        <pre className="text-xs leading-relaxed text-gray-400 overflow-x-auto max-h-32">
          {article.jsonContent || "暂无 JSON 内容"}
        </pre>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>创建于 {article.createdAt}</span>
        <span>更新于 {article.updatedAt}</span>
      </div>
    </div>
  );
}

interface ArticleEditorProps {
  article?: MarketArticle | null;
  onSave: (article: Partial<MarketArticle>) => void;
  onCancel: () => void;
}

function ArticleEditor({ article, onSave, onCancel }: ArticleEditorProps) {
  const [form, setForm] = useState({
    title: article?.title || "",
    description: article?.description || "",
    text: article?.text || "",
    jsonContent: article?.jsonContent || "",
    tags: article?.tags.join(", ") || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[#2a2a3e] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">
            {article?.id ? "编辑文章" : "创建文章"}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">标题</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 bg-[#0d0d14] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              placeholder="文章标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">描述</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 bg-[#0d0d14] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              placeholder="简短描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">标签（用逗号分隔）</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-4 py-3 bg-[#0d0d14] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              placeholder="狼人杀, 角色扮演, 推理"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">文字内容</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 bg-[#0d0d14] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              placeholder="文章的详细文字内容..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">JSON 内容（允许一键复制）</label>
            <textarea
              value={form.jsonContent}
              onChange={(e) => setForm({ ...form, jsonContent: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 bg-[#0d0d14] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-none font-mono text-sm"
              placeholder='{"key": "value", ...}'
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-sm font-semibold text-gray-400 bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl hover:bg-[#2a2a3e] transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-sky-500 rounded-xl hover:from-emerald-400 hover:to-sky-400 transition-all"
            >
              {article?.id ? "保存修改" : "创建文章"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Market() {
  const [articles, setArticles] = useState<MarketArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<MarketArticle | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch("/api/market");
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setShowEditor(true);
  };

  const handleEdit = (article: MarketArticle) => {
    setEditingArticle(article);
    setShowEditor(true);
  };

  const handleSave = async (data: Partial<MarketArticle>) => {
    try {
      const method = editingArticle?.id ? "PUT" : "POST";
      const url = editingArticle?.id ? `/api/market?id=${editingArticle.id}` : "/api/market";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        setShowEditor(false);
        setEditingArticle(null);
        fetchArticles();
        showNotification("success", editingArticle?.id ? "文章已更新" : "文章已创建");
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm("确定要删除这篇文章吗？")) return;

    try {
      const response = await fetch(`/api/market?id=${articleId}`, { method: "DELETE" });
      const result = await response.json();

      if (result.success) {
        fetchArticles();
        showNotification("success", "文章已删除");
      } else {
        showNotification("error", result.message || "删除失败");
      }
    } catch (error) {
      showNotification("error", "删除失败");
    }
  };

  const handleCopyJson = async (article: MarketArticle) => {
    try {
      await navigator.clipboard.writeText(article.jsonContent);
      showNotification("success", "JSON 已复制到剪贴板");
    } catch {
      showNotification("error", "复制失败");
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.10),transparent_28%,rgba(59,130,246,0.08)_70%,transparent)] pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between px-12 py-6">
        <div className="flex items-center gap-3">
          <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" strokeWidth="2" />
            <circle cx="20" cy="20" r="8" fill="url(#logoGrad)" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-2xl font-bold tracking-tight text-white">XTPlay</span>
        </div>

        <nav className="flex items-center gap-6">
          {[
            { name: "首页", href: "/" },
            { name: "管理", href: "/manage" },
            { name: "文档", href: "/docs" },
            { name: "Market", href: "/market" },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                item.name === "Market" ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {item.name}
            </a>
          ))}
        </nav>
      </header>

      <main className="relative z-10 px-12 py-8 max-w-6xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-emerald-300">XTPlay Market</div>
            <h1 className="mt-3 text-4xl font-bold text-white">场景模板市场</h1>
            <p className="mt-4 max-w-3xl text-base text-gray-400">
              浏览和导入可复用的 Ground 模板场景，每个模板包含文字说明和可一键复制的 JSON 配置。
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-sky-400"
          >
            创建文章
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
            <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-500">暂无文章，点击&quot;创建文章&quot;开始添加</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCopyJson={handleCopyJson}
              />
            ))}
          </div>
        )}
      </main>

      {showEditor && (
        <ArticleEditor
          article={editingArticle}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingArticle(null);
          }}
        />
      )}

      {notification && (
        <div
          className={`fixed bottom-8 right-8 z-50 rounded-xl px-6 py-3 text-sm font-medium shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-500/90 text-white"
              : "bg-red-500/90 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      <footer className="relative z-10 border-t border-[#1f1f2e] px-12 py-8">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>© 2026 XTPlay · 场景 Market</span>
          <div className="flex items-center gap-6">
            <a href="/docs" className="transition-colors hover:text-white">文档</a>
            <a href="/market" className="transition-colors hover:text-white">Market</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
