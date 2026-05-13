import { fetchJson } from '@/utils/api'

export interface TTSResponse {
  audio_base64: string
  format: string
}

export const ttsService = {
  async synthesize(text: string, role: string): Promise<TTSResponse> {
    return fetchJson<TTSResponse>('/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text, role }),
    })
  },
}
