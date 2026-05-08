<template>
  <el-container class="app-layout">
    <el-aside width="220px" class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">XTPlay</h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        router
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-sub-menu index="manage">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>管理</span>
          </template>
          <el-menu-item index="/manage/roles">角色管理</el-menu-item>
          <el-menu-item index="/manage/presets">预设管理</el-menu-item>
          <el-menu-item index="/manage/entries">条目管理</el-menu-item>
          <el-menu-item index="/manage/lorebooks">世界书管理</el-menu-item>
          <el-menu-item index="/manage/stories">故事管理</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/read">
          <el-icon><Reading /></el-icon>
          <span>阅读</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { House, Setting, Reading } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.sidebar {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-color-primary);
  margin: 0;
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  background: var(--el-bg-color);
  padding: 0;
}
</style>
