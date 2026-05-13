<template>
  <div class="crud-layout">
    <div class="list-panel">
      <div class="list-header">
        <h2 class="list-title">{{ title }}</h2>
        <button class="btn-primary btn-sm" @click="$emit('create')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建
        </button>
      </div>

      <div v-if="searchable" class="list-search">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          class="search-input"
        />
      </div>

      <div class="list-body">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="list-item"
          :class="{ active: selectedId === item.id }"
          @click="$emit('select', item.id)"
        >
          <div class="item-avatar">{{ getItemInitial(item) }}</div>
          <div class="item-content">
            <div class="item-title">{{ getItemTitle(item) }}</div>
            <div v-if="getItemSubtitle(item)" class="item-subtitle">{{ getItemSubtitle(item) }}</div>
          </div>
          <button
            class="item-delete"
            @click.stop="$emit('delete', item.id)"
            title="删除"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
        <div v-if="filteredItems.length === 0" class="list-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          <p>{{ emptyText || '暂无数据' }}</p>
        </div>
      </div>
    </div>

    <div class="edit-panel">
      <slot name="edit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface ListItem {
  id: number
  name?: string
  title?: string
  description?: string
  personality?: string
  comment?: string
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
  const q = searchQuery.value.toLowerCase()
  return props.items.filter(item => {
    const title = getItemTitle(item).toLowerCase()
    const sub = getItemSubtitle(item).toLowerCase()
    return title.includes(q) || sub.includes(q)
  })
})

function getItemTitle(item: ListItem): string {
  return (item.name || item.title || `#${item.id}`) as string
}

function getItemSubtitle(item: ListItem): string {
  return (item.description || item.personality || item.comment || '') as string
}

function getItemInitial(item: ListItem): string {
  const title = getItemTitle(item)
  return title.charAt(0).toUpperCase()
}
</script>

<style scoped>
.crud-layout {
  display: flex;
  height: 100vh;
}

/* ===== 列表面板 ===== */
.list-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.list-title {
  font-size: var(--font-lg);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  background: var(--primary-light);
}

.btn-sm {
  padding: 5px 12px;
  font-size: var(--font-xs);
}

/* 搜索 */
.list-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-main);
}

.search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-sm);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

/* 列表 */
.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 2px;
}

.list-item:hover {
  background: var(--bg-main);
}

.list-item.active {
  background: var(--primary-bg);
}

.item-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--primary-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.list-item.active .item-avatar {
  background: var(--primary);
  color: white;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-subtitle {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-delete {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.list-item:hover .item-delete {
  opacity: 1;
}

.item-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--text-tertiary);
}

.list-empty svg {
  margin-bottom: 12px;
  opacity: 0.3;
}

.list-empty p {
  font-size: var(--font-sm);
  margin: 0;
}

/* ===== 编辑面板 ===== */
.edit-panel {
  flex: 1;
  background: var(--bg-main);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
