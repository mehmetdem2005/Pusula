import { Audio } from 'expo-av'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useSynthesizeSentence } from '../../hooks/useBookTTS'
import { Icon } from '../ui/Icon'

interface Props {
  text: string
  language: string
  bookId?: string
  voiceId?: string
  engine?: 'edge' | 'elevenlabs'
  speed?: number
  highlightMode?: 'word' | 'sentence' | 'off'
  highlightColor?: string
  autoPlay?: boolean
  onComplete?: () => void
  onWordHighlight?: (wordIndex: number, word: string) => void
  compact?: boolean
}

/**
 * KaraokeTTSPlayer
 * ================
 *
 * Bir cümle TTS oynatıcısı. Word-level highlight (Speechify tarzı).
 *  - Audio download + play
 *  - Word timings ile aktif kelime vurgu
 *  - Speed control (0.5x-2x)
 *  - Auto-advance callback
 *
 * Engine seçimi prop'tan; Edge default (free), ElevenLabs (Pro).
 */
export function KaraokeTTSPlayer({
  text,
  language,
  bookId,
  voiceId,
  engine = 'edge',
  speed = 1.0,
  highlightMode = 'word',
  highlightColor = '#F59E0B',
  autoPlay = false,
  onComplete,
  onWordHighlight,
  compact = false,
}: Props) {
  const synth = useSynthesizeSentence()
  const soundRef = useRef<Audio.Sound | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)
  const [currentSpeed, setCurrentSpeed] = useState(speed)
  const positionRef = useRef(0)

  // Kelimelere böl
  const words = text.match(/\S+/g) ?? []

  const loadAndPlay = async () => {
    setIsLoading(true)

    try {
      const result = await synth.mutateAsync({
        text,
        language,
        voiceId,
        engine,
        bookId,
      })

      // Audio yükle
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: result.audioUrl },
        { shouldPlay: false, rate: currentSpeed, shouldCorrectPitch: true },
      )

      soundRef.current = sound

      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (!s.isLoaded) return
        positionRef.current = s.positionMillis ?? 0

        // Word highlight güncelle
        if (highlightMode === 'word' && result.wordTimings.length > 0) {
          const idx = result.wordTimings.findIndex(
            (w) => positionRef.current >= w.startMs && positionRef.current <= w.endMs,
          )
          if (idx !== currentWordIdx) {
            setCurrentWordIdx(idx)
            if (idx >= 0) onWordHighlight?.(idx, result.wordTimings[idx].word)
          }
        }

        if (s.didJustFinish) {
          setIsPlaying(false)
          setCurrentWordIdx(-1)
          onComplete?.()
        }
      })

      setIsLoading(false)
      await sound.playAsync()
      setIsPlaying(true)
    } catch (e: any) {
      setIsLoading(false)
      console.error('TTS hata:', e)
    }
  }

  const togglePlay = async () => {
    if (!soundRef.current) {
      await loadAndPlay()
      return
    }

    if (isPlaying) {
      await soundRef.current.pauseAsync()
      setIsPlaying(false)
    } else {
      await soundRef.current.playAsync()
      setIsPlaying(true)
    }
  }

  const stop = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync()
      await soundRef.current.unloadAsync()
      soundRef.current = null
    }
    setIsPlaying(false)
    setCurrentWordIdx(-1)
  }

  const cycleSpeed = async () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0]
    const idx = speeds.indexOf(currentSpeed)
    const next = speeds[(idx + 1) % speeds.length]
    setCurrentSpeed(next)
    if (soundRef.current) {
      await soundRef.current.setRateAsync(next, true)
    }
  }

  // Auto-play
  useEffect(() => {
    if (autoPlay) loadAndPlay()
    return () => {
      stop()
    }
  }, [text])

  // Cleanup
  useEffect(() => {
    return () => {
      stop()
    }
  }, [])

  if (compact) {
    return (
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={togglePlay}
          disabled={isLoading}
          className="w-9 h-9 bg-ink-900 rounded-full items-center justify-center"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#F59E0B" />
          ) : (
            <Icon name={isPlaying ? 'pause' : 'play'} size={14} color="#F59E0B" />
          )}
        </Pressable>
        <Pressable onPress={cycleSpeed} className="bg-amber-50 rounded-full px-2.5 py-1">
          <Text className="text-amber-700 text-xs font-mono font-bold">x{currentSpeed}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View>
      {/* Highlighted text */}
      {highlightMode !== 'off' && (
        <View className="flex-row flex-wrap mb-3">
          {words.map((w, i) => (
            <Text
              key={i}
              className="text-base text-ink-900 leading-6 mr-1.5"
              style={{
                backgroundColor: i === currentWordIdx ? highlightColor : 'transparent',
                color: i === currentWordIdx ? '#1E1B4B' : '#1E1B4B',
                fontWeight: i === currentWordIdx ? '700' : '400',
                paddingHorizontal: i === currentWordIdx ? 4 : 0,
                borderRadius: 4,
              }}
            >
              {w}
            </Text>
          ))}
        </View>
      )}

      {/* Controls */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={togglePlay}
          disabled={isLoading}
          className="w-12 h-12 bg-ink-900 rounded-full items-center justify-center"
        >
          {isLoading ? (
            <ActivityIndicator color="#F59E0B" />
          ) : (
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} color="#F59E0B" />
          )}
        </Pressable>

        <Pressable
          onPress={cycleSpeed}
          className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5"
        >
          <Text className="text-amber-700 text-xs font-mono font-bold">x{currentSpeed}</Text>
        </Pressable>

        {isPlaying && (
          <Pressable onPress={stop} className="bg-slate-100 rounded-full px-3 py-1.5">
            <Icon name="x" size={14} color="#64748B" />
          </Pressable>
        )}

        <Text className="text-[10px] text-slate-500 ml-auto font-mono">
          {engine === 'elevenlabs' ? 'ElevenLabs' : 'Edge TTS'}
        </Text>
      </View>
    </View>
  )
}
