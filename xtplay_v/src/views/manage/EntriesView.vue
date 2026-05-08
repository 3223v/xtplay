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
        :title="`编辑条目: ${store.selectedItem.comment || `UID ${store.selectedItem.uid}`}`"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        @save="handleSave"
      >
        <el-form :model="formData" label-position="top" class="edit-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="UID">
                <el-input-number v-model="formData.uid" :min="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序">
                <el-input-number v-model="formData.order" :min="0" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="备注">
            <el-input v-model="formData.comment" placeholder="条目备注" />
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="keywordsInput" placeholder="关键词1, 关键词2" />
          </el-form-item>
          <el-form-item label="次要关键词">
            <el-input v-model="secondaryKeywordsInput" placeholder="次要关键词1, 次要关键词2" />
          </el-form-item>
          <el-form-item label="内容">
            <el-input v-model="formData.content" type="textarea" :rows="8" placeholder="注入到世界书中的内容" />
          </el-form-item>
        </el-form>
      </edit-panel>
      <edit-panel v-else title="请选择一个条目" subtitle="从左侧列表选择条目进行编辑">
        <el-empty description="请选择一个条目" />
      </edit-panel>
    </template>
  </crud-layout>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import CrudLayout from '@/components/CrudLayout.vue'
import EditPanel from '@/components/EditPanel.vue'
import { useEntryStore } from '@/stores'
import type { Entry } from '@/types'

const store = useEntryStore()

const formData = reactive<Partial<Entry>>({
  uid: 0,
  order: 100,
  key: [],
  keysecondary: [],
  comment: '',
  content: '',
})

const keywordsInput = ref('')
const secondaryKeywordsInput = ref('')

watch(() => store.selectedItem, (item) => {
  if (item) {
    Object.assign(formData, {
      uid: item.uid,
      order: item.order,
      key: item.key || [],
      keysecondary: item.keysecondary || [],
      comment: item.comment,
      content: item.content,
    })
    keywordsInput.value = (item.key || []).join(', ')
    secondaryKeywordsInput.value = (item.keysecondary || []).join(', ')
  }
}, { immediate: true })

store.fetchAll()

function handleSelect(id: number) {
  store.select(id)
}

async function handleCreate() {
  try {
    const created = await store.create({ uid: 0, comment: '新条目', order: 100 })
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
  const data = {
    ...formData,
    key: keywordsInput.value.split(',').map(s => s.trim()).filter(Boolean),
    keysecondary: secondaryKeywordsInput.value.split(',').map(s => s.trim()).filter(Boolean),
  }
  try {
    await store.update(store.selectedItem.id, data)
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped>
.edit-form {
  max-width: 950px;
  width: 100%;
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
