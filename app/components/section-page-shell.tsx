"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import UserMenu from "./UserMenu";

export interface SectionPageItem {
  id: string;
  title: string;
  summary: string;
  blocks?: string[];
  code?: string;
  content?: ReactNode;
}

interface SectionPageShellProps {
  activeNav: "docs" | "market";
  sections: SectionPageItem[];
  codeTitle?: string;
}

export function SectionPageShell({
  activeNav,
  sections,
  codeTitle = "参考结构",
}: SectionPageShellProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      for (let i = 0; i < 56; i += 1) {
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
        ctx.fillStyle = `rgba(82, 180, 255, ${p.opacity})`;
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

  const activeContent = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection, sections],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f1f5f9]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_28%,rgba(99,102,241,0.08)_70%,transparent)] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 lg:px-12 py-4 md:py-6 bg-white/80 backdrop-blur-sm border-b border-[#e2e8f0]">
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
            { name: "市场", href: "/public/market" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                (activeNav === "docs" && item.href === "/docs") ||
                (activeNav === "market" && item.href === "/market")
                  ? "text-[#3b82f6]"
                  : "text-[#64748b] hover:text-[#3b82f6]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <UserMenu />
      </header>

      <div className="relative z-10 flex min-h-screen">
        <aside
          className={`fixed left-0 top-[73px] bottom-0 w-72 overflow-hidden rounded-r-2xl border-r border-[#e2e8f0] bg-white/95 shadow-lg shadow-blue-900/5 transition-all duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-blue-500">
                  {activeNav === "docs" ? "技术文档" : "场景 Market"}
                </div>
                <div className="mt-1 text-xs text-[#64748b]">
                  {activeNav === "docs" ? "围绕当前代码实现整理" : "围绕可复用 Ground 模板整理"}
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg border border-[#e2e8f0] p-2 text-[#64748b] transition-colors hover:text-[#1e293b] hover:border-blue-300 bg-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                    activeSection === section.id
                      ? "border-blue-400 bg-blue-50 text-[#1e293b]"
                      : "border-transparent bg-transparent text-[#64748b] hover:border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]"
                  }`}
                >
                  <div className="text-sm font-semibold">{section.title}</div>
                  <div className="mt-1 text-xs leading-4 text-inherit opacity-80">
                    {section.summary}
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {!sidebarOpen ? (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-28 z-30 rounded-lg border border-[#e2e8f0] bg-white p-2 text-[#64748b] transition-colors hover:text-[#1e293b]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}

        <main className={`flex-1 px-8 pt-[73px] pb-8 overflow-y-auto transition-all duration-300 ${sidebarOpen ? "ml-72" : "ml-0"}`}>
          <div className="mx-auto max-w-4xl">
            {activeContent ? (
              <section className="space-y-4">
                <div className="rounded-2xl bg-white/80 p-8">
                  <div className="max-w-3xl">
                    <div className="text-xs uppercase tracking-[0.28em] text-blue-500">
                      {activeContent.id}
                    </div>
                    <h2 className="mt-2 text-3xl font-semibold text-[#1e293b]">{activeContent.title}</h2>
                    <p className="mt-3 text-base leading-7 text-[#64748b]">{activeContent.summary}</p>
                  </div>

                  {activeContent.content ? (
                    <div className="mt-8">{activeContent.content}</div>
                  ) : (
                    <>
                      <div className="mt-8 grid gap-4">
                        {activeContent.blocks?.map((item, index) => (
                          <div
                            key={`${activeContent.id}-${index}`}
                            className="rounded-xl bg-[#f8fafc]/80 px-5 py-4 text-sm leading-7 text-[#475569]"
                          >
                            {item}
                          </div>
                        ))}
                      </div>

                      {activeContent.code ? (
                        <div className="mt-8 overflow-hidden rounded-xl bg-[#f8fafc]/80">
                          <div className="border-b border-[#e2e8f0]/50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#3b82f6]">
                            {codeTitle}
                          </div>
                          <pre className="overflow-x-auto p-5 text-sm leading-7 text-[#475569]">
                            <code>{activeContent.code}</code>
                          </pre>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
