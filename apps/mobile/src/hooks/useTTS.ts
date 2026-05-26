import { useCallback, useEffect, useState } from 'react'
import { type TTSMode, tts } from '../lib/voice/tts'

interface UseTTSOptions {
  language?: string
  voice?: string
  speed?: number
  mode?: TTSMode
  autoPlay?: boolean
}

/**
 * Metin seslendirme kontrolü.
 * Auto-play modda, text değiştikçe otomatik seslendirir.
 */
export function useTTS(opts: UseTTSOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      tts.stop()
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return
      setError(null)
      tts.speak({
        text,
        language: opts.language ?? 'tr',
        voice: opts.voice,
        speed: opts.speed ?? 1.0,
        mode: opts.mode ?? 'auto',
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: (err) => {
          setError(err.message)
          setIsSpeaking(false)
        },
      })
    },
    [opts.language, opts.voice, opts.speed, opts.mode],
  )

  const stop = useCallback(async () => {
    await tts.stop()
    setIsSpeaking(false)
  }, [])

  return { speak, stop, isSpeaking, error }
}
