<template>
  <div class="page-container">
    <div class="section-header fade-in-up">
      <h1 class="section-title">XTPlay 内容管理系统</h1>
      <p class="section-subtitle">管理你的角色、预设、世界书和故事数据</p>
    </div>

    <!-- 快捷入口 -->
    <div class="grid fade-in-up" style="animation-delay: 0.1s">
      <router-link
        v-for="mod in modules"
        :key="mod.path"
        :to="mod.path"
        class="module-card"
        :style="{ '--card-color': mod.color }"
      >
        <div class="card-icon" v-html="mod.icon"></div>
        <div class="card-info">
          <h3 class="card-title">{{ mod.title }}</h3>
          <p class="card-desc">{{ mod.description }}</p>
        </div>
        <div class="card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </router-link>
    </div>

    <!-- 快速步骤 -->
    <div class="guide-section fade-in-up" style="animation-delay: 0.2s">
      <div class="section-header" style="margin-bottom: 20px">
        <h2 class="section-title">快速开始</h2>
      </div>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>创建角色</h4>
            <p>定义角色的基本信息、性格和对话示例</p>
          </div>
        </div>
        <div class="step-connector">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="2" width="24" height="24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>配置预设</h4>
            <p>设置模型参数和提示词模板</p>
          </div>
        </div>
        <div class="step-connector">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="2" width="24" height="24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>管理世界书</h4>
            <p>组织和管理故事相关的条目集合</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const modules = [
  {
    title: '角色管理',
    description: '创建和管理角色，定义属性、性格和对话',
    path: '/manage/roles',
    color: '#6366f1',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  },
  {
    title: '预设管理',
    description: '配置模型参数，如温度、Top-p 等',
    path: '/manage/presets',
    color: '#10b981',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  },
  {
    title: '条目管理',
    description: '管理独立的条目数据，可用于世界书',
    path: '/manage/entries',
    color: '#f59e0b',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  },
  {
    title: '世界书管理',
    description: '创建和管理世界书，组织条目集合',
    path: '/manage/lorebooks',
    color: '#ef4444',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  },
  {
    title: '故事管理',
    description: '创建和管理故事，组织角色对话和场景',
    path: '/manage/stories',
    color: '#8b5cf6',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  },
  {
    title: '阅读',
    description: '阅读和欣赏 AI 生成的双人故事',
    path: '/read',
    color: '#ec4899',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
  },
]
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.module-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-base);
  position: relative;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.module-card:hover .card-icon {
  color: var(--card-color) !important;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--primary-bg);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.card-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.module-card:hover .card-icon {
  background: color-mix(in srgb, var(--card-color) 12%, transparent);
  color: var(--card-color);
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.card-desc {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.card-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  opacity: 0;
  transition: all var(--transition-base);
}

.module-card:hover .card-arrow {
  opacity: 1;
  right: 12px;
}

/* 引导步骤 */
.guide-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 24px;
}

.steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.step {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  font-weight: 700;
  flex-shrink: 0;
}

.step-content h4 {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.step-content p {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.step-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  margin-top: 6px;
}

@media (max-width: 768px) {
  .steps {
    flex-direction: column;
    gap: 16px;
  }

  .step-connector {
    transform: rotate(90deg);
    padding: 0;
  }
}
</style>
