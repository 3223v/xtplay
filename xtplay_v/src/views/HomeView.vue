<template>
  <div class="home-view">
    <div class="header">
      <h1 class="title">XTPlay 内容管理系统</h1>
      <p class="subtitle">管理您的角色、预设、条目、世界书和故事数据</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="8" v-for="module in modules" :key="module.path">
        <el-card class="module-card" shadow="hover" @click="router.push(module.path)">
          <div class="module-content">
            <el-icon class="module-icon" :style="{ color: module.color }">
              <component :is="module.icon" />
            </el-icon>
            <div class="module-info">
              <h3 class="module-title">{{ module.title }}</h3>
              <p class="module-desc">{{ module.description }}</p>
            </div>
          </div>
          <el-icon class="module-arrow"><ArrowRight /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="quick-start" shadow="never">
      <template #header>
        <div class="card-header">
          <span>快速开始</span>
        </div>
      </template>
      <el-steps :active="3" align-center>
        <el-step title="创建角色" description="定义角色的基本信息和性格" />
        <el-step title="配置预设" description="设置模型参数和提示词" />
        <el-step title="管理世界书" description="组织和管理相关条目" />
      </el-steps>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  House,
  Setting,
  Document,
  Collection,
  Tickets,
  Reading,
  ArrowRight
} from '@element-plus/icons-vue'

const router = useRouter()

const modules = [
  {
    title: '角色管理',
    description: '创建和管理角色，定义角色的属性、性格和对话示例',
    path: '/manage/roles',
    icon: House,
    color: '#409eff',
  },
  {
    title: '预设管理',
    description: '配置模型参数，如温度、top_p、频率惩罚等',
    path: '/manage/presets',
    icon: Setting,
    color: '#67c23a',
  },
  {
    title: '条目管理',
    description: '管理独立的条目数据，可用于角色或世界书',
    path: '/manage/entries',
    icon: Document,
    color: '#e6a23c',
  },
  {
    title: '世界书管理',
    description: '创建和管理世界书，组织相关的条目集合',
    path: '/manage/lorebooks',
    icon: Collection,
    color: '#f56c6c',
  },
  {
    title: '故事管理',
    description: '创建和管理故事，组织角色对话和场景',
    path: '/manage/stories',
    icon: Tickets,
    color: '#909399',
  },
  {
    title: '阅读',
    description: '阅读和享受生成的故事内容',
    path: '/read',
    icon: Reading,
    color: '#c71585',
  },
]
</script>

<style scoped>
.home-view {
  height: 100vh;
  padding: 24px;
  overflow-y: auto;
}

.header {
  margin-bottom: 32px;
}

.title {
  font-size: 30px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 15px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.module-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.module-card:hover {
  transform: translateY(-4px);
}

.module-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.module-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 4px 0;
}

.module-desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.module-arrow {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--el-text-color-placeholder);
  transition: color 0.3s;
}

.module-card:hover .module-arrow {
  color: var(--el-color-primary);
}

:deep(.el-card__body) {
  position: relative;
  padding: 24px;
}

.quick-start {
  margin-top: 32px;
}

.card-header {
  font-weight: 600;
}
</style>
