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
        :title="`编辑世界书: ${store.selectedItem.name || '未命名'}`"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        @save="handleSave"
      >
        <el-form :model="formData" label-position="top" class="edit-form">
          <el-form-item label="名称">
            <el-input v-model="formData.name" placeholder="世界书名称" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="世界书描述" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="扫描深度">
                <el-input-number v-model="formData.scan_depth" :min="1" :max="1000" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Token 预算">
                <el-input-number v-model="formData.token_budget" :min="100" :max="10000" :step="100" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-divider content-position="left">条目</el-divider>
          <div class="entries-section">
            <el-empty v-if="Object.keys(formData.entries || {}).length === 0" description="暂无条目" />
            <div v-else v-for="(entry, uid) in formData.entries" :key="uid" class="entry-item">
              <div class="entry-header">
                <span class="entry-uid">UID {{ uid }}</span>
                <el-button text type="danger" size="small" @click="deleteEntry(uid as string)">删除</el-button>
              </div>
              <el-input v-model="entry.comment" placeholder="备注" size="small" />
              <el-input v-model="entry.content" type="textarea" :rows="3" placeholder="内容" size="small" />
            </div>
          </div>
        </el-form>
      </edit-panel>
      <edit-panel v-else title="请选择一个世界书" subtitle="从左侧列表选择世界书进行编辑">
        <el-empty description="请选择一个世界书" />
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
  name: '',
  description: '',
  scan_depth: 50,
  token_budget: 500,
  entries: {},
})

watch(() => store.selectedItem, (item) => {
  if (item) {
    Object.assign(formData, {
      name: item.name,
      description: item.description,
      scan_depth: item.scan_depth,
      token_budget: item.token_budget,
      entries: item.entries ? { ...item.entries } : {},
    })
  }
}, { immediate: true })

store.fetchAll()

function handleSelect(id: number) {
  store.select(id)
}

async function handleCreate() {
  try {
    const created = await store.create({ name: '新世界书' })
    store.select(created.id)
    ElMessage.success('创建成功')
  } catch {
    ElMessage.error('创建失败')
  }
}

async function handleDelete(id: number) {
  try {
    await store.remove(id)
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handleSave() {
  if (!store.selectedItem) return
  try {
    await store.update(store.selectedItem.id, formData)
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}

function deleteEntry(uid: string) {
  if (formData.entries) {
    delete formData.entries[uid]
  }
}
</script>

<style scoped>
.edit-form {
  max-width: 950px;
  width: 100%;
}

.entries-section {
  margin-top: 16px;
}

.entry-item {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  margin-bottom: 12px;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.entry-uid {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
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
