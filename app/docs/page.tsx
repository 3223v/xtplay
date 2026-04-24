"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface DocSection {
  id: string;
  title: string;
  content: string;
  examples?: { title: string; code: string }[];
}

export default function Docs() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeSection, setActiveSection] = useState("introduction");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sections: DocSection[] = [
    {
      id: "introduction",
      title: "Introduction",
      content: `XTPlay is an AI-powered world simulation platform that allows you to create dynamic, interactive scenarios with AI-controlled roles. Each ground represents a unique world with its own rules, roles, and simulation state.`,
    },
    {
      id: "getting-started",
      title: "Getting Started",
      content: `To start using XTPlay, you first need to create a ground. A ground is a container for your simulation world, containing roles, rules, and simulation configuration. Navigate to the Manage page to create your first ground.`,
      examples: [
        {
          title: "Creating a Ground",
          code: `// Navigate to /manage and click "Create Ground"
// Fill in the name and description
// Configure default model settings`,
        },
      ],
    },
    {
      id: "roles",
      title: "Roles",
      content: `Roles are the AI-controlled entities in your simulation. Each role has a name, description, system prompt, and various attributes that define its behavior. Roles can communicate with each other, vote on decisions, and update their knowledge states.`,
      examples: [
        {
          title: "Role Configuration",
          code: `{
  "name": "Detective",
  "kind": "role",
  "description": "Investigates crimes and gathers evidence",
  "system_prompt": "You are a brilliant detective...",
  "status": "active",
  "model": "gpt-4",
  "temperature": 0.7
}`,
        },
      ],
    },
    {
      id: "saint-role",
      title: "The Saint Role",
      content: `The saint role is a special adjudicator role that can review all roles, votes, and messages in the simulation. Saint can update role attributes, resolve events, and enforce rules. While saint is optional, it adds a layer of governance to your simulation.`,
    },
    {
      id: "simulation-modes",
      title: "Simulation Modes",
      content: `XTPlay 支持三种模拟模式：auto、live 和 mock。这三种模式决定了角色在执行回合时的行为方式，主要区别在于是否调用真实的 LLM API。`,
      examples: [
        {
          title: "模拟模式说明",
          code: `// auto 模式 - 自动模式
// 如果角色或 Ground 配置了 model，则使用真实 LLM API 调用
// 如果没有配置 model，则使用模拟动作
// 这是默认模式，适合大多数场景

// live 模式 - 实时模式
// 无论是否配置 model，都会尝试使用真实 LLM API 调用
// 如果没有配置 model 且没有环境变量 OPENAI_API_KEY，会报错
// 适合需要所有角色都使用真实 AI 的场景

// mock 模式 - 模拟模式
// 完全不调用任何 LLM API，所有角色都使用模拟动作
// 适合快速测试、调试或在没有 API 密钥时使用`,
        },
        {
          title: "模式选择建议",
          code: `// 刚开始使用 XTPlay 或进行测试
// → 使用 auto 模式，不需要配置 API 密钥

// 想要看到 AI 生成的真实对话和决策
// → 使用 live 模式，但需要配置 API 密钥

// 调试角色配置或快速迭代场景
// → 使用 mock 模式，完全离线工作`,
        },
        {
          title: "API 调用失败时的行为",
          code: `// 在 auto 或 live 模式下
// 如果 LLM API 调用失败（例如网络错误、超时等）
// 系统会自动回退到模拟模式，生成模拟动作
// 同时会记录错误信息到角色的 last_error 字段
// 这确保了模拟不会因为 API 问题而中断`,
        },
      ],
    },
    {
      id: "events",
      title: "Event Injection",
      content: `Events are special occurrences that can be injected into the simulation. Currently supported event types include custom events and death votes. Events are adjudicated by saint if present, otherwise they are processed as part of the normal simulation flow.`,
      examples: [
        {
          title: "Death Vote Event",
          code: `{
  "type": "death_vote",
  "title": "Death Vote",
  "prompt": "Each role should vote for someone..."
}`,
        },
      ],
    },
    {
      id: "rounds",
      title: "Rounds and History",
      content: `Each simulation progresses through rounds. A round contains the actions taken by roles, messages delivered, votes cast, and any state changes. The round history is preserved and can be viewed in the sidebar.`,
    },
    {
      id: "api",
      title: "API Reference",
      content: `XTPlay provides RESTful APIs for managing grounds, roles, and simulation rounds. All API endpoints return JSON responses with success status and data payload.`,
      examples: [
        {
          title: "Ground API",
          code: `GET    /api/ground          - List all grounds
POST   /api/ground          - Create a new ground
GET    /api/ground?id={id}  - Get ground by ID
PUT    /api/ground          - Update ground
DELETE /api/ground?id={id}  - Delete ground`,
        },
        {
          title: "Round API",
          code: `GET    /api/round?groundId={id}  - Get rounds
POST   /api/round?groundId={id}  - Create round`,
        },
        {
          title: "Role API",
          code: `GET    /api/role?groundId={id}  - Get roles
POST   /api/role?groundId={id}  - Create role
PUT    /api/role?groundId={id}  - Update role
DELETE /api/role?id={id}  - Delete role`,
        },
      ],
    },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }[] = [];

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

  const activeContent = sections.find((s) => s.id === activeSection);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
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
            { name: "Docs", href: "/docs" },
            { name: "Blog", href: "/blog" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                item.name === "Docs" ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <div className="relative z-10 flex">
        <aside
          className={`fixed left-0 top-24 bottom-0 w-64 bg-[#0d0d14] border-r border-[#1f1f2e] overflow-y-auto transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Documentation
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>
            </div>

            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    activeSection === section.id
                      ? "bg-purple-600/20 text-purple-300 font-medium"
                      : "text-gray-400 hover:bg-[#1a1a2e] hover:text-white"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-28 z-20 p-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        <main
          className={`flex-1 px-8 py-8 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-8"
          }`}
        >
          <div className="max-w-4xl mx-auto">
            {activeContent && (
              <>
                <div className="mb-8">
                  <h1 className="text-4xl font-bold text-white mb-4">
                    {activeContent.title}
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full" />
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-lg text-gray-300 leading-relaxed mb-8">
                    {activeContent.content}
                  </p>

                  {activeContent.examples && activeContent.examples.length > 0 && (
                    <div className="space-y-6">
                      {activeContent.examples.map((example, index) => (
                        <div
                          key={index}
                          className="bg-[#0d0d14] border border-[#1f1f2e] rounded-xl overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-[#1a1a2e] border-b border-[#1f1f2e]">
                            <span className="text-sm font-medium text-gray-400">
                              {example.title}
                            </span>
                          </div>
                          <pre className="p-4 overflow-x-auto">
                            <code className="text-sm text-gray-300 font-mono whitespace-pre">
                              {example.code}
                            </code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-[#1f1f2e]">
                  <div className="flex justify-between">
                    {sections.findIndex((s) => s.id === activeContent.id) > 0 && (
                      <button
                        onClick={() => {
                          const currentIndex = sections.findIndex(
                            (s) => s.id === activeContent.id
                          );
                          setActiveSection(sections[currentIndex - 1].id);
                        }}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16l-4-4m0 0l4-4m-4 4h18"
                          />
                        </svg>
                        Previous
                      </button>
                    )}
                    <div className="flex-1" />
                    {sections.findIndex((s) => s.id === activeContent.id) <
                      sections.length - 1 && (
                      <button
                        onClick={() => {
                          const currentIndex = sections.findIndex(
                            (s) => s.id === activeContent.id
                          );
                          setActiveSection(sections[currentIndex + 1].id);
                        }}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Next
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <footer className="relative z-10 px-12 py-8 border-t border-[#1f1f2e]">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>© 2026 XTPlay. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
