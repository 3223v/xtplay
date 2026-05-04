'use client';

import { useState } from 'react';
import { MarketArticle } from '@/app/lib/market/types';

export interface ArticleEditorProps {
  article?: Partial<MarketArticle> | null;
  onSave: (article: Partial<MarketArticle>) => void;
  onCancel: () => void;
}

export function ArticleEditor({ article, onSave, onCancel }: ArticleEditorProps) {
  const [form, setForm] = useState({
    title: article?.title || '',
    description: article?.description || '',
    text: article?.text || '',
    jsonContent: article?.jsonContent || '',
    tags: Array.isArray(article?.tags) ? article.tags.join(', ') : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-[#1e293b]">
            {article?.id ? '编辑模板' : '创建模板'}
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
              placeholder="模板的详细文字说明..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">JSON 配置</label>
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
              {article?.id ? '保存修改' : '创建模板'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
