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
    if (!confirm("确定要删除这个 Ground 吗？")) return;
    
    try {
      const response = await fetch(`/api/ground?id=${id}`, { method: "DELETE" });
      const result = await response.json();
      
      if (result.success) {
        setGrounds(grounds.filter((g) => g.id !== id));
        if (selectedGround?.id === id) {
          setSelectedGround(null);
          setIsEditing(false);
        }
        alert("Ground deleted successfully!");
      } else {
        alert(`Failed to delete ground: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to delete ground:", error);
      alert("Failed to delete ground. Please try again.");
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
        alert("Ground updated successfully!");
      } else {
        alert(`Failed to update ground: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to update ground:", error);
      alert("Failed to update ground. Please try again.");
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
          name: "New Ground",
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
        alert(`Failed to create ground: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to create ground:", error);
      alert("Failed to create ground. Please try again.");
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
        throw new Error('Please select a file or enter JSON content');
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
        alert("Ground imported successfully!");
      } else {
        alert(`Failed to import ground: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to import ground:", error);
      alert(`Failed to import ground: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    <div className="relative min-h-screen overflow-hidden bg-[#050507]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between px-12 py-6">
        <div className="flex items-center gap-3">
          <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" strokeWidth="2" />
            <circle cx="20" cy="20" r="8" fill="url(#logoGrad)" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-2xl font-bold tracking-tight text-white">XTPlay</span>
        </div>
        <nav className="flex items-center gap-6">
          {[
            { name: "Home", href: "/" },
            { name: "Manage", href: "/manage" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                item.name === "Manage" ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <main className="relative z-10 px-12 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Ground Management</h1>
            <p className="text-gray-400">管理所有工作空间配置</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 text-sm font-semibold text-gray-300 bg-white/10 border border-white/20 rounded-full hover:bg-white/15 hover:border-white/30 transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Import Ground
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-900/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ground
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
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
              placeholder="搜索 Ground..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {filteredGrounds.map((ground) => (
                <div
                  key={ground.id}
                  onClick={() => !isEditing && setSelectedGround(ground)}
                  className={`group p-6 rounded-2xl bg-white/5 border backdrop-blur-sm transition-all duration-300 cursor-pointer ${
                    selectedGround?.id === ground.id
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/10 hover:bg-white/10 hover:border-purple-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {ground.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">{ground.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(ground);
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
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
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
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
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Default Key: ••••••</span>
                      <span>更新于 {ground.updatedAt}</span>
                    </div>
                    <Link
                      href={`/ground?g=${ground.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Open
                    </Link>
                  </div>
                </div>
              ))}

              {filteredGrounds.length === 0 && (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-600 mb-4"
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
                  <p className="text-gray-500">没有找到匹配的 Ground</p>
                </div>
              )}
            </div>

            <div className={`${isEditing ? "block" : "hidden"}`}>
              <div className="sticky top-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                    />
                  </svg>
                  Edit Ground
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                      placeholder="Ground name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                      placeholder="Ground description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default URL</label>
                    <input
                      type="text"
                      value={editForm.default_url || ""}
                      onChange={(e) => setEditForm({ ...editForm, default_url: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                      placeholder="https://api.example.com/chat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Key</label>
                    <input
                      type="text"
                      value={editForm.default_key || ""}
                      onChange={(e) => setEditForm({ ...editForm, default_key: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                      placeholder="default_role"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-900/30"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {!isEditing && (
              <div className="hidden lg:block">
                <div className="sticky top-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-600 mb-4"
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
                  <p className="text-gray-500 mb-2">选择一个 Ground 进行编辑</p>
                  <p className="text-sm text-gray-600">或者点击右上角按钮创建新 Ground</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[#2a2a3e] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Import Ground</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
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
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all ${importMethod === 'file' ? 'border-purple-500 bg-purple-500/10' : 'border-[#2a2a3e] bg-[#1a1a2e]'}`}
                >
                  <span className={`text-sm font-medium ${importMethod === 'file' ? 'text-purple-300' : 'text-gray-400'}`}>
                    Upload JSON File
                  </span>
                </button>
                <button
                  onClick={() => setImportMethod('text')}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all ${importMethod === 'text' ? 'border-purple-500 bg-purple-500/10' : 'border-[#2a2a3e] bg-[#1a1a2e]'}`}
                >
                  <span className={`text-sm font-medium ${importMethod === 'text' ? 'text-purple-300' : 'text-gray-400'}`}>
                    Paste JSON Content
                  </span>
                </button>
              </div>

              {importMethod === 'file' ? (
                <div className="border-2 border-dashed border-[#2a2a3e] rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors">
                  {importFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-white">{importFile.name}</div>
                        <div className="text-xs text-gray-500">{Math.round(importFile.size / 1024)} KB</div>
                      </div>
                      <button
                        onClick={() => setImportFile(null)}
                        className="ml-4 text-gray-400 hover:text-red-400 transition-colors"
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
                        <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-400">Drag and drop your JSON file here</span>
                        <span className="text-xs text-gray-500">or click to browse</span>
                      </div>
                    </label>
                  )}
                </div>
              ) : (
                <textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder="Paste your JSON content here..."
                  className="w-full h-64 px-4 py-3 bg-[#0d0d14] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
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
                className="px-6 py-3 text-sm font-semibold text-gray-400 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 flex items-center gap-2"
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
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="relative z-10 px-12 py-8 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2026 XTPlay.</p>
        </div>
      </footer>
    </div>
  );
}