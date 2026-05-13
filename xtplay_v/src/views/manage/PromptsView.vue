<template>
  <div class="prompts-layout">
    <div class="list-panel">
      <div class="list-header">
        <h2 class="list-title">提示词管理</h2>
        <button class="btn-primary btn-sm" :disabled="store.loading" @click="handleReload">
          <svg v-if="store.loading" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          重载缓存
        </button>
      </div>
      <div class="list-body">
        <div
          v-for="item in store.items"
          :key="item.key"
          class="list-item"
          :class="{ active: selectedKey === item.key }"
          @click="handleSelect(item)"
        >
          <div class="item-content">
            <div class="item-title">{{ item.title || item.key }}</div>
            <div class="item-meta">
              <span class="item-tag">{{ item.category }}</span>
              <span class="item-key">{{ item.key }}</span>
            </div>
          </div>
        </div>
        <div v-if="store.items.length === 0" class="list-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <p>暂无提示词</p>
        </div>
      </div>
    </div>
    <div class="edit-panel">
      <template v-if="selectedItem">
        <div class="edit-header">
          <div>
            <h3 class="edit-title">{{ selectedItem.title }}</h3>
            <p class="edit-subtitle">{{ selectedItem.key }}</p>
          </div>
          <div class="edit-actions">
            <button class="btn-ghost btn-sm" @click="handleCancel">取消</button>
            <button class="btn-primary btn-sm" :disabled="saving" @click="handleSave">
              <svg v-if="saving" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              保存
            </button>
          </div>
        </div>
        <div class="edit-body">
          <div class="edit-form">
            <div class="form-group">
              <label class="form-label">标题</label>
              <input v-model="formData.title" class="form-input" placeholder="标题" />
            </div>
            <div class="form-group">
              <label class="form-label">分类</label>
              <input v-model="formData.category" class="form-input" placeholder="分类" />
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea v-model="formData.description" class="form-textarea" rows="2" placeholder="描述" />
            </div>
            <div class="form-group">
              <label class="form-label">内容</label>
              <textarea v-model="formData.content" class="form-textarea code-textarea" rows="15" placeholder="提示词内容，支持 {{变量}} 模板语法" />
            </div>
          </div>
        </div>
      </template>
      <div v-else class="edit-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <p>请选择一个提示词</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usePromptStore } from '@/stores'
import type { Prompt } from '@/types'

const store = usePromptStore()
const saving = ref(false)
const selectedKey = ref<string | null>(null)
const selectedItem = ref<Prompt | null>(null)

const formData = reactive({
  title: '',
  category: '',
  description: '',
  content: '',
})

function handleSelect(item: Prompt) {
  selectedKey.value = item.key
  selectedItem.value = item
  formData.title = item.title
  formData.category = item.category
  formData.description = item.description
  formData.content = item.content
}

function handleCancel() {
  selectedKey.value = null
  selectedItem.value = null
}

async function handleSave() {
  if (!selectedItem.value) return
  saving.value = true
  try {
    await store.update(selectedItem.value.key, {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      content: formData.content,
    })
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleReload() {
  try {
    await store.reload()
    ElMessage.success('提示词缓存已重载')
  } catch {
    ElMessage.error('重载失败')
  }
}

onMounted(() => {
  store.fetchAll()
})
</script>

<style scoped>
.prompts-layout {
  display: flex;
  height: 100vh;
}

.list-panel {
  width: 320px;
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

.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.list-item {
  padding: 12px;
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

.item-title {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.item-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.item-key {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: var(--text-tertiary);
}

.list-empty svg {
  opacity: 0.3;
  margin-bottom: 12px;
}

.list-empty p {
  font-size: var(--font-sm);
  margin: 0;
}

.edit-panel {
  flex: 1;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.edit-title {
  font-size: var(--font-lg);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.edit-subtitle {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  margin: 4px 0 0 0;
  font-family: monospace;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.edit-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.edit-form {
  max-width: 700px;
}

.edit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}

.edit-empty svg {
  opacity: 0.3;
  margin-bottom: 12px;
}

.edit-empty p {
  font-size: var(--font-sm);
  margin: 0;
}

.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-input:focus { border-color: var(--primary-light); }
.form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); line-height: var(--leading-relaxed); color: var(--text-primary); resize: vertical; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-textarea:focus { border-color: var(--primary-light); }
.code-textarea { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.6; }

.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); font-size: var(--font-sm); font-weight: 500; cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans); }
.btn-primary:hover:not(:disabled) { background: var(--primary-light); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: var(--font-sm); font-weight: 500; cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans); }
.btn-ghost:hover { border-color: var(--primary-light); color: var(--primary); }
.btn-sm { padding: 6px 12px; font-size: var(--font-xs); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>
