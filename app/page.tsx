"use client";

import Link from "next/link";

import { useEffect, useRef } from "react";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      for (let i = 0; i < 80; i++) {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f1f5f9]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-indigo-50 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[150px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-6 bg-white/80 backdrop-blur-sm border-b border-[#e2e8f0]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/blue.png" alt="XTPlay Logo" className="w-10 h-10" />
          <span className="text-2xl font-bold tracking-tight text-[#1e293b]">XTPlay</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "首页", href: "/" },
            { label: "管理", href: "/manage" },
            { label: "文档", href: "/docs" },
            { label: "市场", href: "/market" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-[#64748b] hover:text-[#3b82f6] transition-colors duration-300"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full hover:from-blue-400 hover:to-indigo-400 transition-all duration-300 shadow-lg shadow-blue-500/20">
          <Link href="/manage">开始使用</Link>
        </button>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] pt-24 pb-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white border border-[#e2e8f0] backdrop-blur-sm shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-[#64748b] tracking-wide uppercase">当前版本</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          <span className="bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#475569] bg-clip-text text-transparent">
            多角色
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 bg-clip-text text-transparent">
            世界模拟
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-[#64748b] mb-12 leading-relaxed">
          构建、管理并推进多角色世界模拟。
          <br className="hidden md:block" />
          面向开发者、设计者与实验者。
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button className="group relative px-8 py-4 text-base font-semibold text-white rounded-full overflow-hidden transition-all duration-300">
            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:from-blue-400 group-hover:to-indigo-400" />
            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <span className="relative flex items-center gap-2">
              <Link href="/manage">开始构建</Link>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </button>
          <button className="px-8 py-4 text-base font-medium text-[#475569] rounded-full border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all duration-300 shadow-sm">
            <Link href="/market">打开市场</Link>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-4xl w-full">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              title: "多智能体系统",
              desc: "部署具有独特个性和行为的多个角色",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: "持久化世界",
              desc: "角色在会话中记忆和演化",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              ),
              title: "开发者优先",
              desc: "强大的 API 和无缝集成工具",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl bg-white border border-[#e2e8f0] shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-500"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4 text-blue-500 group-hover:text-blue-400 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#1e293b] mb-2">{feature.title}</h3>
              <p className="text-sm text-[#64748b] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 px-12 py-4 bg-white/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#94a3b8]">© 2026 XTPlay.</p>
          <div className="flex items-center gap-6">
            {["GitHub"].map((social) => (
              <a
                key={social}
                href={`https://${social.toLowerCase()}.com/3223v/xtplay`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
