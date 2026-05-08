<template>
  <div class="crud-layout">
    <div class="list-panel">
      <div class="list-header">
        <h2 class="list-title">{{ title }}</h2>
        <el-button type="primary" :icon="Plus" size="small" @click="$emit('create')">
          新建
        </el-button>
      </div>
      <div class="list-body">
        <el-input
          v-if="searchable"
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          clearable
          size="small"
          class="search-input"
        />
        <el-scrollbar height="100%">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="list-item"
            :class="{ active: selectedId === item.id }"
            @click="$emit('select', item.id)"
          >
            <div class="item-content">
              <div class="item-title">{{ getItemTitle(item) }}</div>
              <div class="item-subtitle">{{ getItemSubtitle(item) }}</div>
            </div>
            <el-button
              :icon="Delete"
              circle
              size="small"
              text
              class="delete-btn"
              @click.stop="$emit('delete', item.id)"
            />
          </div>
          <el-empty v-if="filteredItems.length === 0" :description="emptyText" />
        </el-scrollbar>
      </div>
    </div>
    <div class="edit-panel">
      <slot name="edit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'

interface ListItem {
  id: number
  [key: string]: unknown
}

const props = defineProps<{
  title: string
  items: ListItem[]
  selectedId: number | null
  searchable?: boolean
  searchPlaceholder?: string
  emptyText?: string
}>()

defineEmits<{
  select: [id: number]
  create: []
  delete: [id: number]
}>()

const searchQuery = ref('')

const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item => {
    const title = getItemTitle(item).toLowerCase()
    const subtitle = getItemSubtitle(item).toLowerCase()
    return title.includes(query) || subtitle.includes(query)
  })
})

function getItemTitle(item: ListItem): string {
  return (item.name || item.title || `项目 ${item.id}`) as string
}

function getItemSubtitle(item: ListItem): string {
  return (item.description || item.personality || '') as string
}
</script>

<style scoped>
.crud-layout {
  display: flex;
  height: 100vh;
  gap: 0;
}

.list-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.list-title {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.list-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.search-input {
  margin-bottom: 12px;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 0;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.list-item:hover {
  background: var(--el-fill-color-light);
}

.list-item.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.list-item:hover .delete-btn {
  opacity: 1;
}

.edit-panel {
  flex: 1;
  background: var(--el-bg-color);
  overflow: auto;
}

/* 输入框字体优化 */
:deep(.el-textarea__inner),
:deep(.el-input__inner) {
  font-size: 15px;
}

:deep(.el-textarea__inner) {
  line-height: 1.8;
}
</style>
