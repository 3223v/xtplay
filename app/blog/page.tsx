"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  tags: string[];
}

export default function Blog() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posts] = useState<BlogPost[]>([
    {
      id: "1",
      title: "Getting Started with XTPlay",
      excerpt: "Learn how to create and manage your first ground with XTPlay's intuitive interface.",
      date: "2026-04-20",
      author: "XTPlay Team",
      tags: ["Tutorial", "Getting Started"],
    },
    {
      id: "2",
      title: "Role-Based Simulation Explained",
      excerpt: "Deep dive into how XTPlay uses AI-powered roles to create dynamic world simulations.",
      date: "2026-04-18",
      author: "XTPlay Team",
      tags: ["Technical", "Concepts"],
    },
    {
      id: "3",
      title: "Advanced Event Injection",
      excerpt: "Master the art of injecting custom events to shape your simulation narratives.",
      date: "2026-04-15",
      author: "XTPlay Team",
      tags: ["Advanced", "Events"],
    },
  ]);

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
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2.5 + 0.5,
          opacity: Math.random() * 0.6 + 0.1,
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
                item.name === "Blog" ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <main className="relative z-10 px-12 py-8 max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">XTPlay Blog</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            News, tutorials, and insights about AI-powered world simulations
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[#2a2a3e] rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20"
            >
              <div className="absolute top-4 right-4">
                <span className="text-xs text-gray-500">{post.date}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs font-medium text-purple-300 bg-purple-900/30 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h2 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                {post.title}
              </h2>

              <p className="text-gray-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">By {post.author}</span>
                <button className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                  Read more
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[#2a2a3e] rounded-2xl">
            <h3 className="text-lg font-semibold text-white">More Coming Soon</h3>
            <p className="text-gray-400 text-sm max-w-md">
              Stay tuned for more articles about world simulation, AI role-playing, and advanced XTPlay features.
            </p>
          </div>
        </div>
      </main>

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
