<template>
  <crud-layout
    title="世界书管理"
    :items="store.items"
    :selected-id="store.selectedId"
    empty-text="暂无世界书"
    @select="handleSelect"
    @create="handleCreate"
    @delete="handleDelete"
  >
    <template #edit>
      <edit-panel
        v-if="store.selectedItem"
        :title="store.selectedItem.name || '未命名世界书'"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        :import-export-data="store.selectedItem"
        entity-name="lorebook"
        @save="handleSave"
        @import="handleImport"
      >
        <div class="edit-form">
          <div class="form-group">
            <label class="form-label">名称</label>
            <input v-model="formData.name" class="form-input" placeholder="世界书名称" />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="formData.description" class="form-textarea" rows="2" placeholder="世界书描述" />
          </div>
          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">扫描深度</label>
                <input v-model.number="formData.scan_depth" type="number" min="1" max="1000" class="form-input" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">Token 预算</label>
                <input v-model.number="formData.token_budget" type="number" min="100" max="10000" step="100" class="form-input" />
              </div>
            </div>
          </div>

          <div class="form-divider">条目</div>

          <div v-if="Object.keys(formData.entries || {}).length === 0" class="entries-empty">
            <p>暂无条目</p>
          </div>
          <div v-else class="entries-list">
            <div v-for="(entry, uid) in formData.entries" :key="uid as string" class="entry-card">
              <div class="entry-card-header">
                <span class="entry-card-uid">#{{ uid }}</span>
                <button class="entry-delete-btn" @click="deleteEntry(uid as string)">&times;</button>
              </div>
              <input v-model="entry.comment" class="entry-input" placeholder="备注" />
              <textarea v-model="entry.content" class="entry-textarea" placeholder="内容" rows="3" />
            </div>
          </div>
        </div>
      </edit-panel>
      <edit-panel v-else title="选择一个世界书" subtitle="从左侧列表选择世界书进行编辑">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          <p>请选择一个世界书</p>
        </div>
      </edit-panel>
    </template>
  </crud-layout>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CrudLayout from '@/components/CrudLayout.vue'
import EditPanel from '@/components/EditPanel.vue'
import { useLorebookStore } from '@/stores'
import type { Lorebook, Entry } from '@/types'

const store = useLorebookStore()

const formData = reactive<Partial<Lorebook>>({
  name: '', description: '', scan_depth: 50, token_budget: 500, entries: {},
})

watch(() => store.selectedItem, (item) => {
  if (item) {
    Object.assign(formData, {
      name: item.name, description: item.description, scan_depth: item.scan_depth, token_budget: item.token_budget,
      entries: item.entries ? { ...item.entries } : {},
    })
  }
}, { immediate: true })

store.fetchAll()

function handleSelect(id: number) { store.select(id) }

async function handleCreate() {
  try { const created = await store.create({ name: '新世界书' }); store.select(created.id); ElMessage.success('创建成功') }
  catch { ElMessage.error('创建失败') }
}

async function handleDelete(id: number) {
  try { await store.remove(id); ElMessage.success('删除成功') }
  catch { ElMessage.error('删除失败') }
}

async function handleSave() {
  if (!store.selectedItem) return
  try { await store.update(store.selectedItem.id, formData); ElMessage.success('保存成功') }
  catch { ElMessage.error('保存失败') }
}

async function handleImport(data: unknown) {
  try {
    const created = await store.create(data as Partial<Lorebook>)
    store.select(created.id)
    ElMessage.success('导入成功')
  } catch { ElMessage.error('导入失败') }
}

function deleteEntry(uid: string) {
  if (formData.entries) delete formData.entries[uid]
}
</script>

<style scoped>
.edit-form { max-width: 600px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-tertiary); }
.empty-state svg { margin-bottom: 12px; opacity: 0.3; }
.empty-state p { font-size: var(--font-sm); margin: 0; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-col { min-width: 0; }
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-input:focus { border-color: var(--primary-light); }
.form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); line-height: var(--leading-relaxed); color: var(--text-primary); resize: vertical; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-textarea:focus { border-color: var(--primary-light); }
.form-divider { font-size: var(--font-sm); font-weight: 600; color: var(--text-secondary); padding: 16px 0 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }

.entries-empty { padding: 24px 0; text-align: center; color: var(--text-tertiary); font-size: var(--font-sm); }
.entries-list { display: flex; flex-direction: column; gap: 12px; }
.entry-card { background: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; }
.entry-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.entry-card-uid { font-size: var(--font-xs); font-weight: 600; color: var(--text-tertiary); }
.entry-delete-btn { width: 24px; height: 24px; border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all var(--transition-fast); }
.entry-delete-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
.entry-input { width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; margin-bottom: 8px; }
.entry-input:focus { border-color: var(--primary-light); }
.entry-textarea { width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); line-height: var(--leading-relaxed); color: var(--text-primary); resize: vertical; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.entry-textarea:focus { border-color: var(--primary-light); }
</style>
