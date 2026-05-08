<template>
  <crud-layout
    title="预设管理"
    :items="store.items"
    :selected-id="store.selectedId"
    empty-text="暂无预设"
    @select="handleSelect"
    @create="handleCreate"
    @delete="handleDelete"
  >
    <template #edit>
      <edit-panel
        v-if="store.selectedItem"
        :title="`编辑预设`"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        @save="handleSave"
      >
        <el-form :model="formData" label-position="top" class="edit-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="温度">
                <el-input-number v-model="formData.temperature" :min="0" :max="2" :step="0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="频率惩罚">
                <el-input-number v-model="formData.frequency_penalty" :min="0" :max="2" :step="0.1" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="存在惩罚">
                <el-input-number v-model="formData.presence_penalty" :min="0" :max="2" :step="0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="top_p">
                <el-input-number v-model="formData.top_p" :min="0" :max="1" :step="0.05" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="top_k">
                <el-input-number v-model="formData.top_k" :min="1" :max="100" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="重复惩罚">
                <el-input-number v-model="formData.repetition_penalty" :min="1" :max="2" :step="0.1" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="主提示词">
            <el-input v-model="formData.main_prompt" type="textarea" :rows="3" placeholder="主提示词" />
          </el-form-item>
          <el-form-item label="扮演提示词">
            <el-input v-model="formData.impersonation_prompt" type="textarea" :rows="2" placeholder="扮演提示词" />
          </el-form-item>
          <el-form-item label="预设回复">
            <el-input v-model="formData.assistant_prefill" type="textarea" :rows="2" placeholder="预设回复" />
          </el-form-item>
          <el-form-item label="越狱提示词">
            <el-input v-model="formData.jailbreak_prompt" type="textarea" :rows="2" placeholder="越狱提示词" />
          </el-form-item>
        </el-form>
      </edit-panel>
      <edit-panel v-else title="请选择一个预设" subtitle="从左侧列表选择预设进行编辑">
        <el-empty description="请选择一个预设" />
      </edit-panel>
    </template>
  </crud-layout>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CrudLayout from '@/components/CrudLayout.vue'
import EditPanel from '@/components/EditPanel.vue'
import { usePresetStore } from '@/stores'
import type { Preset } from '@/types'

const store = usePresetStore()

const formData = reactive<Partial<Preset>>({
  temperature: 0.75,
  frequency_penalty: 0.8,
  presence_penalty: 0.8,
  top_p: 0.99,
  top_k: 75,
  top_a: 0,
  min_p: 0.1,
  repetition_penalty: 1.1,
  names_in_completion: true,
  main_prompt: '',
  impersonation_prompt: '',
  assistant_prefill: '',
  jailbreak_prompt: '',
})

watch(() => store.selectedItem, (item) => {
  if (item) {
    Object.assign(formData, { ...item })
  }
}, { immediate: true })

store.fetchAll()

function handleSelect(id: number) {
  store.select(id)
}

async function handleCreate() {
  try {
    const created = await store.create({ temperature: 0.75 })
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
