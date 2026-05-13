<template>
  <crud-layout
    title="条目管理"
    :items="store.items"
    :selected-id="store.selectedId"
    :searchable="true"
    search-placeholder="搜索条目..."
    empty-text="暂无条目"
    @select="handleSelect"
    @create="handleCreate"
    @delete="handleDelete"
  >
    <template #edit>
      <edit-panel
        v-if="store.selectedItem"
        :title="`${store.selectedItem.comment || `UID ${store.selectedItem.uid}`}`"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        :import-export-data="store.selectedItem"
        entity-name="entry"
        @save="handleSave"
        @import="handleImport"
      >
        <div class="edit-form">
          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">UID</label>
                <input v-model.number="formData.uid" type="number" min="0" class="form-input" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">排序</label>
                <input v-model.number="formData.order" type="number" min="0" class="form-input" />
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <input v-model="formData.comment" class="form-input" placeholder="条目备注" />
          </div>
          <div class="form-group">
            <label class="form-label">关键词</label>
            <input v-model="keywordsInput" class="form-input" placeholder="关键词1, 关键词2" />
          </div>
          <div class="form-group">
            <label class="form-label">次要关键词</label>
            <input v-model="secondaryKeywordsInput" class="form-input" placeholder="次要关键词1, 次要关键词2" />
          </div>
          <div class="form-group">
            <label class="form-label">内容</label>
            <textarea v-model="formData.content" class="form-textarea" rows="8" placeholder="注入到世界书中的内容" />
          </div>
        </div>
      </edit-panel>
      <edit-panel v-else title="选择一个条目" subtitle="从左侧列表选择条目进行编辑">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>请选择一个条目</p>
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
import { useEntryStore } from '@/stores'
import type { Entry } from '@/types'

const store = useEntryStore()

const formData = reactive<Partial<Entry>>({
  uid: 0, order: 100, key: [], keysecondary: [], comment: '', content: '',
})

const keywordsInput = ref('')
const secondaryKeywordsInput = ref('')

watch(() => store.selectedItem, (item) => {
  if (item) {
    Object.assign(formData, { uid: item.uid, order: item.order, key: item.key || [], keysecondary: item.keysecondary || [], comment: item.comment, content: item.content })
    keywordsInput.value = (item.key || []).join(', ')
    secondaryKeywordsInput.value = (item.keysecondary || []).join(', ')
  }
}, { immediate: true })

store.fetchAll()

function handleSelect(id: number) { store.select(id) }

async function handleCreate() {
  try {
    const created = await store.create({ uid: 0, comment: '新条目', order: 100 })
    store.select(created.id)
    ElMessage.success('创建成功')
  } catch { ElMessage.error('创建失败') }
}

async function handleDelete(id: number) {
  try { await store.remove(id); ElMessage.success('删除成功') }
  catch { ElMessage.error('删除失败') }
}

async function handleSave() {
  if (!store.selectedItem) return
  const data = {
    ...formData,
    key: keywordsInput.value.split(',').map(s => s.trim()).filter(Boolean),
    keysecondary: secondaryKeywordsInput.value.split(',').map(s => s.trim()).filter(Boolean),
  }
  try { await store.update(store.selectedItem.id, data); ElMessage.success('保存成功') }
  catch { ElMessage.error('保存失败') }
}

async function handleImport(data: unknown) {
  try {
    const created = await store.create(data as Partial<Entry>)
    store.select(created.id)
    ElMessage.success('导入成功')
  } catch { ElMessage.error('导入失败') }
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
</style>
