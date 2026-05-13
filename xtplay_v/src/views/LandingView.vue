<template>
  <div class="landing">
    <!-- 导航栏 -->
    <header class="navbar" :class="{ scrolled: scrolled }">
      <div class="nav-inner">
        <div class="nav-logo">
          <span class="nav-logo-icon">X</span>
          <span class="nav-logo-text">XTPlay</span>
        </div>
        <nav class="nav-links">
          <a href="#features" class="nav-link">功能</a>
          <a href="#how-it-works" class="nav-link">使用流程</a>
          <template v-if="authStore.isLoggedIn">
            <router-link to="/dashboard" class="btn-primary-sm">进入控制台</router-link>
          </template>
          <template v-else>
            <router-link to="/login" class="btn-ghost-sm">登录</router-link>
            <router-link to="/register" class="btn-primary-sm">注册</router-link>
          </template>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <h1 class="hero-title">双人小说 AI 创作平台</h1>
        <p class="hero-subtitle">定义角色、配置世界观，让 AI 为你生成精彩的双人故事。从开场到终章，每一轮对话都充满惊喜。</p>
        <div class="hero-actions">
          <template v-if="authStore.isLoggedIn">
            <router-link to="/dashboard" class="btn-primary-lg">进入控制台</router-link>
          </template>
          <template v-else>
            <router-link to="/register" class="btn-primary-lg">开始创作</router-link>
            <router-link to="/login" class="btn-ghost-lg">登录</router-link>
          </template>
        </div>
      </div>
      <div class="hero-scroll" @click="scrollToFeatures">
        <span>了解更多</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </section>

    <!-- 功能特性 -->
    <section id="features" class="section features-section">
      <div class="section-inner">
        <div class="section-label">功能特性</div>
        <h2 class="section-heading">一站式故事创作工具</h2>
        <p class="section-desc">从角色设定到故事生成，提供完整的创作体验</p>
        <div class="features-grid">
          <div v-for="feat in features" :key="feat.title" class="feature-card">
            <div class="feature-icon" v-html="feat.icon"></div>
            <h3 class="feature-title">{{ feat.title }}</h3>
            <p class="feature-desc">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用流程 -->
    <section id="how-it-works" class="section how-section">
      <div class="section-inner">
        <div class="section-label">使用流程</div>
        <h2 class="section-heading">三步开始你的故事</h2>
        <p class="section-desc">简单直观的流程，快速上手</p>
        <div class="steps">
          <div v-for="(step, i) in steps" :key="i" class="step-card">
            <div class="step-num">{{ i + 1 }}</div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-desc">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section cta-section">
      <div class="section-inner">
        <h2 class="cta-title">准备好开始创作了吗？</h2>
        <p class="cta-desc">免费注册，立即体验 AI 故事创作的魅力</p>
        <template v-if="authStore.isLoggedIn">
          <router-link to="/dashboard" class="btn-primary-lg">进入控制台</router-link>
        </template>
        <template v-else>
          <router-link to="/register" class="btn-primary-lg">免费注册</router-link>
        </template>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-inner">
        <p>XTPlay &mdash; 双人小说 AI 创作平台</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 40
}

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

const features = [
  {
    title: '角色管理',
    desc: '创建和管理 AI 角色，定义性格、对话风格和背景故事，支持完整的角色卡规范。',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  },
  {
    title: '预设配置',
    desc: '精细控制模型生成参数，包括温度、Top-p、频率惩罚等，为不同场景调优。',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  },
  {
    title: '世界书',
    desc: '构建丰富的世界观，通过关键词匹配自动注入相关背景信息，让故事更加连贯。',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  },
  {
    title: 'AI 故事生成',
    desc: '智能生成双人对话故事，自动推进剧情发展，呈现连贯且富有创意的叙事。',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  },
  {
    title: '阅读体验',
    desc: '沉浸式阅读界面，自动推进和场景轮转，享受 AI 创作的每一段故事。',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
  },
  {
    title: '多模型支持',
    desc: '接入多种 LLM 接口，自由选择适合的模型和参数，打造专属创作体验。',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>',
  },
]

const steps = [
  {
    title: '创建角色与配置',
    desc: '定义故事的两位主角，设置他们的性格、对话风格和背景。配置模型参数和生成预设。',
  },
  {
    title: '组织世界观',
    desc: '创建世界书，添加关键词条目。AI 会在故事生成时自动匹配并注入相关背景信息。',
  },
  {
    title: '开始创作',
    desc: '创建故事，选择角色和配置。点击生成，AI 将自动推进双人对话，呈现精彩剧情。',
  },
]
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: #ffffff;
  color: #1e293b;
  font-family: var(--font-sans);
}

/* ===== 导航栏 ===== */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 0;
  transition: all var(--transition-base);
}

.navbar.scrolled {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 10px 0;
}

.nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.nav-logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.nav-logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: var(--font-sm);
  font-weight: 500;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--primary);
  background: var(--primary-bg);
}

/* ===== 按钮 ===== */
.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  padding: 7px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-primary-sm:hover {
  background: var(--primary-light);
}

.btn-ghost-sm {
  display: inline-flex;
  align-items: center;
  padding: 7px 16px;
  background: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-ghost-sm:hover {
  border-color: var(--primary-light);
  color: var(--primary);
}

.btn-primary-lg {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition-base);
}

.btn-primary-lg:hover {
  background: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
}

.btn-ghost-lg {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  background: transparent;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition-base);
}

.btn-ghost-lg:hover {
  border-color: var(--primary-light);
  color: var(--primary);
}

/* ===== Hero ===== */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 120px 24px 80px;
  overflow: hidden;
  background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse 600px 400px at 20% 40%, rgba(79, 70, 229, 0.04) 0%, transparent 70%),
    radial-gradient(ellipse 500px 500px at 80% 60%, rgba(129, 140, 248, 0.03) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  max-width: 700px;
  text-align: center;
  position: relative;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.15;
  color: #0f172a;
  margin: 0 0 20px;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 18px;
  line-height: 1.7;
  color: #64748b;
  margin: 0 0 40px;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.hero-scroll {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: var(--font-xs);
  cursor: pointer;
  transition: color var(--transition-fast);
  animation: bounce 2s infinite;
}

.hero-scroll:hover {
  color: var(--primary);
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
  40% { transform: translateX(-50%) translateY(-8px); }
  60% { transform: translateX(-50%) translateY(-4px); }
}

/* ===== 通用 section ===== */
.section {
  padding: 100px 0;
}

.section-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
}

.section-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-bg);
  padding: 4px 14px;
  border-radius: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.section-heading {
  font-size: 36px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}

.section-desc {
  font-size: 17px;
  color: #64748b;
  margin: 0 0 60px;
  line-height: 1.6;
}

/* ===== 功能特性 ===== */
.features-section {
  background: #f8f9ff;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  text-align: left;
}

.feature-card {
  background: #ffffff;
  border: 1px solid #eef0f2;
  border-radius: var(--radius-lg);
  padding: 28px;
  transition: all var(--transition-base);
}

.feature-card:hover {
  border-color: transparent;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  transform: translateY(-3px);
}

.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--primary-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}

.feature-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px;
}

.feature-desc {
  font-size: var(--font-sm);
  color: #64748b;
  margin: 0;
  line-height: 1.7;
}

/* ===== 使用流程 ===== */
.how-section {
  background: #ffffff;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.step-card {
  text-align: left;
  padding: 32px;
  border: 1px solid #eef0f2;
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.step-card:hover {
  border-color: transparent;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.step-num {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 18px;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px;
}

.step-desc {
  font-size: var(--font-sm);
  color: #64748b;
  margin: 0;
  line-height: 1.7;
}

/* ===== CTA ===== */
.cta-section {
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-top: 1px solid #eef0f2;
}

.cta-title {
  font-size: 36px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
}

.cta-desc {
  font-size: 17px;
  color: #64748b;
  margin: 0 0 36px;
  line-height: 1.6;
}

/* ===== 页脚 ===== */
.footer {
  border-top: 1px solid #eef0f2;
  padding: 24px 0;
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
  font-size: var(--font-sm);
  color: #94a3b8;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .section-heading {
    font-size: 28px;
  }

  .features-grid,
  .steps {
    grid-template-columns: 1fr;
  }

  .nav-links .nav-link {
    display: none;
  }
}
</style>
