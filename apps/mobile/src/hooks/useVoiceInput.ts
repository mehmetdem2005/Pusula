import Constants from 'expo-constants'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { voiceRecorder } from '../lib/voice/recorder'
import { uploadAudio } from '../lib/voice/uploader'

const VOICE_URL =
  process.env.EXPO_PUBLIC_VOICE_BASE_URL ??
  Constants.expoConfig?.extra?.voiceBaseUrl ??
  'http://localhost:4002'

interface UseVoiceInputOptions {
  language?: string
  lessonId?: string
  onTranscribed?: (text: string) => void
  onError?: (err: string) => void
}

export function useVoiceInput(opts: UseVoiceInputOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      voiceRecorder.cancel()
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const granted = await voiceRecorder.requestPermission()
      if (!granted) {
        setError('Mikrofon izni gerekli')
        opts.onError?.('Mikrofon izni reddedildi')
        return
      }
      await voiceRecorder.start()
      setIsRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration(voiceRecorder.getCurrentDuration())
      }, 100) as unknown as number
    } catch (e: any) {
      setError(e.message)
      opts.onError?.(e.message)
    }
  }, [opts])

  const stop = useCallback(async (): Promise<string | null> => {
    if (!voiceRecorder.isRecording()) return null

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)

    try {
      const result = await voiceRecorder.stop()

      // 0.5 sn'den kısa kayıtları yoksay
      if (result.duration < 0.5) {
        return null
      }

      setIsTranscribing(true)

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      // 1. Storage'a yükle
      const storagePath = await uploadAudio(result.uri, userData.user.id)

      // 2. Transcribe et
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch(`${VOICE_URL}/api/voice/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          audioStoragePath: storagePath,
          language: opts.language,
          lessonId: opts.lessonId,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`STT: ${err}`)
      }

      const { text } = (await res.json()) as { text: string }
      opts.onTranscribed?.(text)
      return text
    } catch (e: any) {
      setError(e.message)
      opts.onError?.(e.message)
      return null
    } finally {
      setIsTranscribing(false)
      setDuration(0)
    }
  }, [opts])

  const cancel = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    await voiceRecorder.cancel()
    setIsRecording(false)
    setDuration(0)
  }, [])

  return { start, stop, cancel, isRecording, isTranscribing, duration, error }
}
