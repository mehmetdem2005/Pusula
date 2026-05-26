import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import * as Speech from 'expo-speech'
import { supabase } from '../supabase'

const VOICE_URL =
  process.env.EXPO_PUBLIC_VOICE_BASE_URL ??
  Constants.expoConfig?.extra?.voiceBaseUrl ??
  'http://localhost:4002'

export type TTSMode = 'device' | 'server' | 'auto' | 'off'

export interface SpeakOptions {
  text: string
  language?: string
  voice?: string
  speed?: number
  mode?: TTSMode
  onStart?: () => void
  onDone?: () => void
  onError?: (err: Error) => void
}

/**
 * Kısa metin → cihaz TTS (anında, offline, ücretsiz)
 * Uzun metin → Piper server (kaliteli, cache'li)
 * auto mode: <200 karakter → device, >200 → server
 */
const AUTO_THRESHOLD = 200

class TTSManager {
  private currentSound: Audio.Sound | null = null
  private isSpeaking = false

  async speak(opts: SpeakOptions): Promise<void> {
    const mode = opts.mode ?? 'auto'
    if (mode === 'off') return

    await this.stop()

    const useDevice = mode === 'device' || (mode === 'auto' && opts.text.length < AUTO_THRESHOLD)

    if (useDevice) {
      this.speakDevice(opts)
    } else {
      await this.speakServer(opts)
    }
  }

  private speakDevice(opts: SpeakOptions) {
    this.isSpeaking = true
    opts.onStart?.()

    Speech.speak(opts.text, {
      language: this.mapLanguage(opts.language ?? 'tr'),
      rate: opts.speed ?? 1.0,
      pitch: 1.0,
      onDone: () => {
        this.isSpeaking = false
        opts.onDone?.()
      },
      onStopped: () => {
        this.isSpeaking = false
      },
      onError: (err: any) => {
        this.isSpeaking = false
        opts.onError?.(new Error(err?.message ?? 'TTS error'))
      },
    })
  }

  private async speakServer(opts: SpeakOptions) {
    try {
      this.isSpeaking = true
      opts.onStart?.()

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Oturum yok')

      const res = await fetch(`${VOICE_URL}/api/voice/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: opts.text,
          language: opts.language ?? 'tr',
          voice: opts.voice,
          speed: opts.speed ?? 1.0,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`TTS server: ${err}`)
      }

      const { url } = (await res.json()) as { url: string }

      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true })
      this.currentSound = sound

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isSpeaking = false
          this.currentSound = null
          sound.unloadAsync()
          opts.onDone?.()
        }
      })
    } catch (err: any) {
      this.isSpeaking = false
      opts.onError?.(err)
      // Server başarısızsa cihaz TTS'e fallback
      console.warn('Server TTS failed, falling back to device:', err.message)
      this.speakDevice(opts)
    }
  }

  async stop(): Promise<void> {
    if (this.isSpeaking) {
      try {
        Speech.stop()
      } catch {}
      if (this.currentSound) {
        try {
          await this.currentSound.stopAsync()
          await this.currentSound.unloadAsync()
        } catch {}
        this.currentSound = null
      }
      this.isSpeaking = false
    }
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  /**
   * Expo Speech dil kodları bazen BCP-47 ister (tr-TR).
   */
  private mapLanguage(code: string): string {
    const map: Record<string, string> = {
      tr: 'tr-TR',
      en: 'en-US',
      de: 'de-DE',
      es: 'es-ES',
      fr: 'fr-FR',
      it: 'it-IT',
      pt: 'pt-BR',
      ru: 'ru-RU',
      nl: 'nl-NL',
      pl: 'pl-PL',
      ar: 'ar-SA',
      fa: 'fa-IR',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    }
    return map[code] ?? code
  }

  /** Cihaz üzerindeki mevcut sesleri listele */
  async listDeviceVoices() {
    return await Speech.getAvailableVoicesAsync()
  }
}

export const tts = new TTSManager()
