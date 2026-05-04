"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import UserMenu from "../../components/UserMenu";

interface MarketArticle {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  text?: string;
  jsonContent?: string;
  createdAt: string;
  updatedAt: string;
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-[#1e293b]">
            {article?.id ? "编辑市场模板" : "创建市场模板"}
          </h3>
          <button onClick={onCancel} className="text-[#64748b] hover:text-[#1e293b] transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">标题</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              placeholder="模板标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">描述</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              placeholder="简短描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">标签（用逗号分隔）</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              placeholder="狼人杀, 角色扮演, 推理"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">文字内容</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
              placeholder="模板的详细文字内容..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">JSON 内容（允许一键复制）</label>
            <textarea
              value={form.jsonContent}
              onChange={(e) => setForm({ ...form, jsonContent: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none font-mono text-sm"
              placeholder='{"key": "value", ...}'
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-sm font-semibold text-[#64748b] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f8fafc] transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-400 hover:to-indigo-400 transition-all shadow-lg shadow-blue-500/20"
            >
              {article?.id ? "保存修改" : "创建模板"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PublicMarket() {
  const [articles, setArticles] = useState<MarketArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<MarketArticle | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<MarketArticle | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch("/api/public/market");
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
      }
    } catch (error) {
      console.error("获取市场文章列表失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = async (article: MarketArticle) => {
    try {
      await navigator.clipboard.writeText(article.jsonContent || "");
      showNotification("success", "JSON 已复制到剪贴板");
    } catch {
      showNotification("error", "复制失败");
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
      const url = editingArticle?.id ? `/api/public/market?id=${editingArticle.id}` : "/api/public/market";

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
        showNotification("success", editingArticle?.id ? "模板已更新" : "模板已创建");
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm("确定要删除这个市场模板吗？")) return;

    try {
      const response = await fetch(`/api/public/market?id=${articleId}`, { method: "DELETE" });
      const result = await response.json();

      if (result.success) {
        fetchArticles();
        showNotification("success", "模板已删除");
      } else {
        showNotification("error", result.message || "删除失败");
      }
    } catch (error) {
      showNotification("error", "删除失败");
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f1f5f9]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_28%,rgba(99,102,241,0.08)_70%,transparent)] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-6 bg-white/80 backdrop-blur-sm border-b border-[#e2e8f0]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/blue.png" alt="XTPlay Logo" className="w-10 h-10" />
          <span className="text-2xl font-bold tracking-tight text-[#1e293b]">XTPlay</span>
        </Link>

        <nav className="flex items-center gap-6">
          {[
            { name: "首页", href: "/" },
            { name: "管理", href: "/manage" },
            { name: "文档", href: "/docs" },
            { name: "模板", href: "/market" },
            { name: "市场", href: "/public/market", active: true },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                item.active ? "text-[#3b82f6]" : "text-[#64748b] hover:text-[#3b82f6]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <UserMenu />
      </header>

      <main className="relative z-10 px-12 pt-32 pb-8 max-w-6xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-blue-500">XTPlay Market</div>
            <h1 className="mt-3 text-4xl font-bold text-[#1e293b]">场景模板市场</h1>
            <p className="mt-4 max-w-3xl text-base text-[#64748b]">
              浏览可复用的 Ground 模板场景，每个模板包含文字说明和可一键复制的 JSON 配置。
              这些模板对所有用户可见，可自由导入使用。
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-indigo-400"
          >
            创建模板
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-[28px] border border-[#e2e8f0] bg-white p-12 text-center shadow-sm">
            <svg className="mx-auto h-16 w-16 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-[#64748b]">暂无市场模板</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="rounded-[20px] border border-[#e2e8f0] bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[#1e293b]">{article.title}</h3>
                    {article.description && (
                      <p className="mt-1 text-sm text-[#64748b] line-clamp-2">{article.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(article)}
                      className="rounded-lg border border-[#e2e8f0] p-2 text-[#64748b] transition-colors hover:border-blue-400 hover:text-blue-500 bg-white"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="rounded-lg border border-[#e2e8f0] p-2 text-[#64748b] transition-colors hover:border-red-400 hover:text-red-500 bg-white"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {article.text && (
                  <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#64748b] mb-2">简介</div>
                    <p className="text-sm leading-relaxed text-[#475569] line-clamp-3">
                      {article.text}
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#64748b]">JSON 配置</div>
                    <button
                      onClick={() => handleCopyJson(article)}
                      className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-200"
                    >
                      复制
                    </button>
                  </div>
                  <pre className="text-xs leading-relaxed text-[#64748b] overflow-x-auto max-h-32">
                    {article.jsonContent || "暂无 JSON 配置"}
                  </pre>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-[#94a3b8]">
                  <span>创建于 {article.createdAt}</span>
                  <span>更新于 {article.updatedAt}</span>
                </div>
              </div>
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
              ? "bg-blue-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}