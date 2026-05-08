<template>
  <div class="opening-panel">
    <div class="panel-header">
      <div>
        <h3 class="panel-title">初始场景与旁白</h3>
        <p class="panel-subtitle">第一次开始前必须确认开场内容</p>
      </div>
      <el-button size="small" @click="handleGenerate" :loading="store.creatingOpening">
        {{ store.creatingOpening ? 'AI 生成中...' : 'AI 生成' }}
      </el-button>
    </div>

    <el-form :model="localDraft" label-position="top">
      <el-form-item label="初始场景">
        <el-input
          v-model="localDraft.scene"
          type="textarea"
          :rows="4"
          placeholder="例如：雨夜的旧车站、停摆的时钟、两人第一次重逢的站台..."
        />
      </el-form-item>
      <el-form-item label="初始旁白">
        <el-input
          v-model="localDraft.narration"
          type="textarea"
          :rows="5"
          placeholder="写给读者看的开场旁白，负责氛围、环境和进入故事的钩子。"
        />
      </el-form-item>
      <el-form-item label="第一位行动角色">
        <el-radio-group v-model="localDraft.first">
          <el-radio value="role1">{{ role1Name }}</el-radio>
          <el-radio value="role2">{{ role2Name }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <div class="panel-footer">
      <el-button
        type="primary"
        size="small"
        @click="handleSave"
        :disabled="!localDraft.scene.trim() || !localDraft.narration.trim()"
        :loading="store.savingOpening"
      >
        确认开场
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useStoryStore } from '@/stores'
import type { OpeningDraft } from '@/types'

const store = useStoryStore()

const localDraft = reactive<OpeningDraft>({
  scene: '',
  narration: '',
  first: 'role1',
})

watch(() => store.openingDraft, (val) => {
  if (val) {
    localDraft.scene = val.scene
    localDraft.narration = val.narration
    localDraft.first = val.first
  }
}, { immediate: true })

const role1Name = (store.selectedItem?.role1?.name as string) || '角色 1'
const role2Name = (store.selectedItem?.role2?.name as string) || '角色 2'

async function handleGenerate() {
  if (!store.selectedItem) return
  try {
    await store.generateOpening(store.selectedItem.id)
  } catch {
    ElMessage.error('生成失败')
  }
}

async function handleSave() {
  if (!store.selectedItem) return
  try {
    await store.createRound(store.selectedItem.id, {
      scene: localDraft.scene,
      narration: localDraft.narration,
      first: localDraft.first,
      next_scene: '',
      next_narration: '',
      next_first: localDraft.first,
      role1_action: '',
      role1_dialogue: '',
      role1_output: '',
      role2_action: '',
      role2_dialogue: '',
      role2_output: '',
    })
    ElMessage.success('开场已保存')
  } catch {
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped>
.opening-panel {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 4px 0;
}

.panel-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
