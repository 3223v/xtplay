"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Ground {
  id: string;
  name: string;
  description: string;
  default_url: string;
  default_key: string;
  createdAt: string;
  updatedAt: string;
}

export default function Manage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGround, setSelectedGround] = useState<Ground | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Ground>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [importContent, setImportContent] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    fetchGrounds();
  }, []);

  const fetchGrounds = async () => {
    try {
      const response = await fetch("/api/ground");
      const result = await response.json();
      if (result.success) {
        setGrounds(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch grounds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个工作空间吗？")) return;
    
    try {
      const response = await fetch(`/api/ground?id=${id}`, { method: "DELETE" });
      const result = await response.json();
      
      if (result.success) {
        setGrounds(grounds.filter((g) => g.id !== id));
        if (selectedGround?.id === id) {
          setSelectedGround(null);
          setIsEditing(false);
        }
        alert("工作空间删除成功！");
      } else {
        alert(`删除工作空间失败: ${result.message}`);
      }
    } catch (error) {
      console.error("删除工作空间失败:", error);
      alert("删除工作空间失败，请重试。");
    }
  };

  const handleEdit = (ground: Ground) => {
    setSelectedGround(ground);
    setEditForm({ ...ground });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedGround) return;

    try {
      const response = await fetch("/api/ground", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      
      if (result.success) {
        setGrounds(grounds.map((g) => (g.id === selectedGround.id ? result.data : g)));
        setIsEditing(false);
        setSelectedGround(null);
        setEditForm({});
        alert("工作空间更新成功！");
      } else {
        alert(`更新工作空间失败: ${result.message}`);
      }
    } catch (error) {
      console.error("更新工作空间失败:", error);
      alert("更新工作空间失败，请重试。");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedGround(null);
    setEditForm({});
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/ground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "新工作空间",
          description: "",
          default_url: "",
          default_key: "",
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setGrounds([...grounds, result.data]);
        handleEdit(result.data);
      } else {
        alert(`创建工作空间失败: ${result.message}`);
      }
    } catch (error) {
      console.error("创建工作空间失败:", error);
      alert("创建工作空间失败，请重试。");
    }
  };

  const handleImport = async () => {
    if (isImporting) return;
    
    try {
      setIsImporting(true);
      let data;
      
      if (importMethod === 'file' && importFile) {
        const reader = new FileReader();
        data = await new Promise((resolve, reject) => {
          reader.onload = (e) => {
            try {
              resolve(JSON.parse(e.target?.result as string));
            } catch (error) {
              reject(new Error('Invalid JSON file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(importFile);
        });
      } else if (importMethod === 'text' && importContent) {
        data = JSON.parse(importContent);
      } else {
        throw new Error('请选择文件或输入 JSON 内容');
      }

      const response = await fetch("/api/ground/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGrounds([...grounds, result.data]);
        setShowImportModal(false);
        setImportContent('');
        setImportFile(null);
        alert("工作空间导入成功！");
      } else {
        alert(`导入工作空间失败: ${result.message}`);
      }
    } catch (error) {
      console.error("导入工作空间失败:", error);
      alert(`导入工作空间失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredGrounds = grounds.filter(
    (ground) =>
      ground.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ground.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f1f5f9]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-indigo-50 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[150px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-12 py-6 bg-white/80 backdrop-blur-sm border-b border-[#e2e8f0]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/blue.png" alt="XTPlay Logo" className="w-10 h-10" />
          <span className="text-2xl font-bold tracking-tight text-[#1e293b]">XTPlay</span>
        </Link>
        <nav className="flex items-center gap-6">
          {[
            { name: "首页", href: "/" },
            { name: "管理", href: "/manage" },
            { name: "文档", href: "/docs" },
            { name: "市场", href: "/market" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                item.name === "管理" ? "text-[#3b82f6]" : "text-[#64748b] hover:text-[#3b82f6]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <main className="relative z-10 px-12 pt-32 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1e293b] mb-2">工作空间管理</h1>
            <p className="text-[#64748b]">管理所有工作空间配置</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 text-sm font-semibold text-[#475569] bg-white border border-[#e2e8f0] rounded-full hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all duration-300 flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导入工作空间
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full hover:from-blue-400 hover:to-indigo-400 transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建工作空间
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="搜索工作空间..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {filteredGrounds.map((ground) => (
                <div
                  key={ground.id}
                  onClick={() => !isEditing && setSelectedGround(ground)}
                  className={`group p-6 rounded-2xl bg-white border backdrop-blur-sm transition-all duration-300 cursor-pointer ${
                    selectedGround?.id === ground.id
                      ? "border-blue-400 shadow-md shadow-blue-500/10"
                      : "border-[#e2e8f0] hover:shadow-md hover:border-[#cbd5e1]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1e293b] group-hover:text-blue-600 transition-colors">
                          {ground.name}
                        </h3>
                        <p className="text-sm text-[#64748b] mt-1">{ground.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(ground);
                        }}
                        className="p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-[#f8fafc] rounded-lg transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ground.id);
                        }}
                        className="p-2 text-[#64748b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-[#94a3b8]">
                      <span>默认密钥: ••••••</span>
                      <span>更新于 {ground.updatedAt}</span>
                    </div>
                    <Link
                      href={`/ground?g=${ground.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      打开
                    </Link>
                  </div>
                </div>
              ))}

              {filteredGrounds.length === 0 && (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto text-[#94a3b8] mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                    />
                  </svg>
                  <p className="text-[#64748b]">没有找到匹配的工作空间</p>
                </div>
              )}
            </div>

            <div className={`${isEditing ? "block" : "hidden"}`}>
              <div className="sticky top-28 p-6 rounded-2xl bg-white border border-[#e2e8f0]">
                <h3 className="text-xl font-semibold text-[#1e293b] mb-6 flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                    />
                  </svg>
                  编辑工作空间
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">名称</label>
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300"
                      placeholder="工作空间名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">描述</label>
                    <textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300 resize-none"
                      placeholder="工作空间描述"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">默认 URL</label>
                    <input
                      type="text"
                      value={editForm.default_url || ""}
                      onChange={(e) => setEditForm({ ...editForm, default_url: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300"
                      placeholder="https://api.example.com/chat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">默认密钥</label>
                    <input
                      type="text"
                      value={editForm.default_key || ""}
                      onChange={(e) => setEditForm({ ...editForm, default_key: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300"
                      placeholder="default_role"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-400 hover:to-indigo-400 transition-all duration-300 shadow-lg shadow-blue-500/20"
                    >
                      保存修改
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all duration-300"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {!isEditing && (
              <div className="hidden lg:block">
                <div className="sticky top-28 p-6 rounded-2xl bg-white border border-[#e2e8f0] text-center">
                  <svg
                    className="w-16 h-16 mx-auto text-[#94a3b8] mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                    />
                  </svg>
                  <p className="text-[#64748b] mb-2">选择一个工作空间进行编辑</p>
                  <p className="text-sm text-[#94a3b8]">或者点击右上角按钮创建新工作空间</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-2xl bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#1e293b]">导入工作空间</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[#64748b] hover:text-[#1e293b] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setImportMethod('file')}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all ${importMethod === 'file' ? 'border-blue-400 bg-blue-50 text-[#3b82f6]' : 'border-[#e2e8f0] bg-white text-[#64748b]'}`}
                >
                  <span className={`text-sm font-medium ${importMethod === 'file' ? 'text-blue-600' : 'text-[#64748b]'}`}>
                    上传 JSON 文件
                  </span>
                </button>
                <button
                  onClick={() => setImportMethod('text')}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all ${importMethod === 'text' ? 'border-blue-400 bg-blue-50 text-[#3b82f6]' : 'border-[#e2e8f0] bg-white text-[#64748b]'}`}
                >
                  <span className={`text-sm font-medium ${importMethod === 'text' ? 'text-blue-600' : 'text-[#64748b]'}`}>
                    粘贴 JSON 内容
                  </span>
                </button>
              </div>

              {importMethod === 'file' ? (
                <div className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-white">
                  {importFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-[#1e293b]">{importFile.name}</div>
                        <div className="text-xs text-[#94a3b8]">{Math.round(importFile.size / 1024)} KB</div>
                      </div>
                      <button
                        onClick={() => setImportFile(null)}
                        className="ml-4 text-[#64748b] hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => e.target.files && setImportFile(e.target.files[0])}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-[#64748b]">拖拽 JSON 文件到这里</span>
                        <span className="text-xs text-[#94a3b8]">或点击浏览</span>
                      </div>
                    </label>
                  )}
                </div>
              ) : (
                <textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder="在这里粘贴 JSON 内容..."
                  className="w-full h-64 px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportContent('');
                  setImportFile(null);
                  setImportMethod('file');
                }}
                className="px-6 py-3 text-sm font-semibold text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg hover:from-blue-400 hover:to-indigo-400 transition-all duration-300 flex items-center gap-2"
                disabled={isImporting}
              >
                {isImporting ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {isImporting ? '导入中...' : '导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}