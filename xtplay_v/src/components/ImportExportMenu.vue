<template>
  <div class="import-export-menu" ref="menuRef">
    <button class="btn-ghost btn-sm" @click="toggleMenu" title="导入/导出">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      导入/导出
    </button>

    <div v-if="open" class="dropdown">
      <button class="dropdown-item" @click="handleDownload">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        下载 JSON 文件
      </button>
      <button class="dropdown-item" @click="handleCopy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        复制 JSON
      </button>
      <button class="dropdown-item" @click="handleFileImport">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/></svg>
        从文件导入
      </button>
      <button class="dropdown-item" @click="handlePaste">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
        粘贴 JSON
      </button>
    </div>

    <input type="file" ref="fileInput" accept=".json" @change="handleFileChange" hidden />

    <Teleport to="body">
      <div v-if="showPasteDialog" class="dialog-overlay" @click.self="showPasteDialog = false">
        <div class="dialog">
          <h3 class="dialog-title">粘贴 JSON</h3>
          <textarea v-model="pasteText" class="dialog-textarea" placeholder="在此粘贴 JSON 数据..." rows="8"></textarea>
          <div class="dialog-actions">
            <button class="btn-ghost btn-sm" @click="showPasteDialog = false">取消</button>
            <button class="btn-primary btn-sm" @click="handlePasteConfirm">导入</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  data: unknown
  entityName: string
}>()

const emit = defineEmits<{
  import: [data: unknown]
}>()

const menuRef = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const showPasteDialog = ref(false)
const pasteText = ref('')

function toggleMenu() {
  open.value = !open.value
}

function closeMenu() {
  open.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as HTMLElement)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function copyToClipboard(data: unknown) {
  const json = JSON.stringify(data, null, 2)
  navigator.clipboard.writeText(json).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string))
      } catch {
        reject(new Error('无效的 JSON 格式'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

function handleDownload() {
  downloadJson(props.data, `${props.entityName}_${Date.now()}.json`)
  ElMessage.success('已导出文件')
  closeMenu()
}

async function handleCopy() {
  copyToClipboard(props.data)
  closeMenu()
}

function handleFileImport() {
  fileInput.value?.click()
  closeMenu()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const data = await readJsonFile(file)
    emit('import', data)
    ElMessage.success('导入成功')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '导入失败')
  }

  input.value = ''
}

function handlePaste() {
  pasteText.value = ''
  showPasteDialog.value = true
  closeMenu()
}

function handlePasteConfirm() {
  if (!pasteText.value.trim()) {
    ElMessage.warning('请输入 JSON 数据')
    return
  }
  try {
    const data = JSON.parse(pasteText.value)
    showPasteDialog.value = false
    emit('import', data)
    ElMessage.success('导入成功')
  } catch {
    ElMessage.error('无效的 JSON 格式')
  }
}
</script>

<style scoped>
.import-export-menu {
  position: relative;
}

.dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  margin-top: 4px;
  min-width: 180px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-sm);
  font-family: var(--font-sans);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.dropdown-item:hover {
  background: var(--bg-main);
  color: var(--text-primary);
}

.dropdown-item svg {
  flex-shrink: 0;
  opacity: 0.6;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.dialog {
  width: 500px;
  max-width: 100%;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-xl);
}

.dialog-title {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.dialog-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  line-height: var(--leading-relaxed);
  color: var(--text-primary);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
  background: var(--bg-main);
}

.dialog-textarea:focus {
  border-color: var(--primary-light);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
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
  font-family: var(--font-sans);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-light);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.btn-ghost:hover {
  border-color: var(--primary-light);
  color: var(--primary);
}

.btn-sm {
  padding: 5px 12px;
  font-size: var(--font-xs);
}
</style>
