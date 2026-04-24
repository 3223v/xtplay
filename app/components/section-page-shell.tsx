"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

export interface SectionPageItem {
  id: string;
  title: string;
  summary: string;
  blocks: string[];
  code?: string;
}

interface SectionPageShellProps {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  activeNav: "docs" | "market";
  footerLabel: string;
  sections: SectionPageItem[];
  codeTitle?: string;
  heroPanel?: ReactNode;
}

export function SectionPageShell({
  heroEyebrow,
  heroTitle,
  heroDescription,
  activeNav,
  footerLabel,
  sections,
  codeTitle = "参考结构",
  heroPanel,
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
    <div className="relative min-h-screen overflow-hidden bg-[#050507]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
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
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                (activeNav === "docs" && item.href === "/docs") ||
                (activeNav === "market" && item.href === "/market")
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <div className="relative z-10 flex">
        <aside
          className={`fixed left-0 top-24 bottom-0 w-72 overflow-y-auto border-r border-[#1f1f2e] bg-[#0d0f16]/95 backdrop-blur-xl transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-emerald-300">
                  {activeNav === "docs" ? "技术文档" : "场景 Market"}
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  {activeNav === "docs" ? "围绕当前代码实现整理" : "围绕可复用 Ground 模板整理"}
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg border border-[#2a2a3e] p-2 text-gray-500 transition-colors hover:text-white"
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
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : "border-transparent bg-transparent text-gray-400 hover:border-[#2a2a3e] hover:bg-[#141826] hover:text-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{section.title}</div>
                  <div className="mt-1 text-xs leading-5 text-inherit opacity-80">
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
            className="fixed left-4 top-28 z-20 rounded-lg border border-[#2a2a3e] bg-[#151722] p-2 text-gray-400 transition-colors hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}

        <main className={`flex-1 px-8 py-8 transition-all duration-300 ${sidebarOpen ? "ml-72" : "ml-8"}`}>
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.32em] text-sky-300">{heroEyebrow}</div>
              <h1 className="mt-3 max-w-4xl text-4xl font-bold text-white">{heroTitle}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300">{heroDescription}</p>
            </div>

            {heroPanel ? <div className="mb-10">{heroPanel}</div> : null}

            {activeContent ? (
              <section className="space-y-6">
                <div className="rounded-[28px] border border-white/10 bg-[#0d0f16]/95 p-8 backdrop-blur-xl">
                  <div className="max-w-3xl">
                    <div className="text-xs uppercase tracking-[0.28em] text-emerald-300">
                      {activeContent.id}
                    </div>
                    <h2 className="mt-2 text-3xl font-semibold text-white">{activeContent.title}</h2>
                    <p className="mt-3 text-base leading-7 text-gray-300">{activeContent.summary}</p>
                  </div>

                  <div className="mt-8 grid gap-4">
                    {activeContent.blocks.map((item, index) => (
                      <div
                        key={`${activeContent.id}-${index}`}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-gray-300"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  {activeContent.code ? (
                    <div className="mt-8 overflow-hidden rounded-2xl border border-[#243047] bg-[#090b12]">
                      <div className="border-b border-[#1f2a40] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                        {codeTitle}
                      </div>
                      <pre className="overflow-x-auto p-5 text-sm leading-7 text-slate-200">
                        <code>{activeContent.code}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>

      <footer className="relative z-10 border-t border-[#1f1f2e] px-12 py-8">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{footerLabel}</span>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="transition-colors hover:text-white">
              文档
            </Link>
            <Link href="/market" className="transition-colors hover:text-white">
              Market
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
