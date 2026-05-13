<template>
  <button
    class="tts-btn"
    :class="[state, side]"
    :disabled="state === 'loading'"
    :title="state === 'playing' ? '停止' : state === 'loading' ? '加载中' : state === 'error' ? '播放失败' : '朗读'"
    @click="handleClick"
  >
    <svg v-if="state === 'idle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
    <svg v-else-if="state === 'loading'" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
    <svg v-else-if="state === 'playing'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="16" height="16">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { ttsService } from '@/api/services/ttsService'

const props = defineProps<{
  text: string
  role: 'role1' | 'role2'
  side?: 'left' | 'right'
}>()

const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')

let audioInstance: HTMLAudioElement | null = null

async function handleClick() {
  if (state.value === 'playing') {
    stopAudio()
    return
  }

  if (!props.text.trim()) return

  state.value = 'loading'
  try {
    const res = await ttsService.synthesize(props.text, props.role)
    const audioSrc = `data:audio/${res.format};base64,${res.audio_base64}`
    playAudio(audioSrc)
  } catch {
    state.value = 'error'
    setTimeout(() => {
      if (state.value === 'error') state.value = 'idle'
    }, 2000)
  }
}

function playAudio(src: string) {
  stopAudio()

  audioInstance = new Audio(src)
  audioInstance.onended = () => {
    state.value = 'idle'
    audioInstance = null
  }
  audioInstance.onerror = () => {
    state.value = 'error'
    audioInstance = null
    setTimeout(() => {
      if (state.value === 'error') state.value = 'idle'
    }, 2000)
  }
  audioInstance.play().then(() => {
    state.value = 'playing'
  }).catch(() => {
    state.value = 'error'
    audioInstance = null
    setTimeout(() => {
      if (state.value === 'error') state.value = 'idle'
    }, 2000)
  })
}

function stopAudio() {
  if (audioInstance) {
    audioInstance.pause()
    audioInstance.currentTime = 0
    audioInstance = null
  }
  if (state.value === 'playing') {
    state.value = 'idle'
  }
}

onUnmounted(() => {
  stopAudio()
})
</script>

<style scoped>
.tts-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.tts-btn:hover:not(:disabled) {
  background: var(--bg-main);
  color: var(--primary);
  border-color: var(--border);
}

.tts-btn:disabled {
  cursor: not-allowed;
}

.tts-btn.playing {
  color: var(--primary);
  background: var(--primary-bg);
  border-color: var(--primary-light);
}

.tts-btn.error {
  color: #ef4444;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
