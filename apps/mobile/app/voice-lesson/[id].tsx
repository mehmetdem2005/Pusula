import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMessages, useSendMessage } from '../../src/hooks/useLessons'
import { useTTS } from '../../src/hooks/useTTS'
import { useVoiceInput } from '../../src/hooks/useVoiceInput'

type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

export default function VoiceLesson() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: messages } = useMessages(id ?? null)
  const { send, streamingText, isStreaming, error } = useSendMessage(id ?? null)
  const { speak, stop: stopTTS, isSpeaking } = useTTS({ language: 'tr', mode: 'auto' })

  const [phase, setPhase] = useState<Phase>('idle')
  const [lastUserText, setLastUserText] = useState<string>('')
  const [lastAITextDisplay, setLastAITextDisplay] = useState<string>('')
  const lastReadIdRef = useRef<string | null>(null)

  const { start, stop, cancel, isRecording, isTranscribing, duration } = useVoiceInput({
    language: 'tr',
    lessonId: id,
    onTranscribed: (text) => {
      setLastUserText(text)
      setPhase('thinking')
      send(text)
    },
    onError: (err) => {
      setPhase('idle')
      console.warn('Voice error:', err)
    },
  })

  // Phase güncelleme
  useEffect(() => {
    if (isRecording) setPhase('recording')
    else if (isTranscribing) setPhase('transcribing')
    else if (isStreaming) setPhase('thinking')
    else if (isSpeaking) setPhase('speaking')
    else setPhase('idle')
  }, [isRecording, isTranscribing, isStreaming, isSpeaking])

  // Asistan yanıtı tamamlandığında otomatik seslendir
  useEffect(() => {
    if (!messages || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    if (last.id === lastReadIdRef.current) return
    if (isStreaming) return
    lastReadIdRef.current = last.id
    setLastAITextDisplay(last.content)
    speak(last.content)
  }, [messages, isStreaming, speak])

  const handlePress = async () => {
    if (phase === 'speaking') {
      await stopTTS()
      return
    }
    if (phase === 'idle') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
      start()
    }
  }

  const handleRelease = async () => {
    if (isRecording) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      stop()
    }
  }

  const handleClose = async () => {
    await stopTTS()
    if (isRecording) await cancel()
    router.back()
  }

  const phaseLabel: Record<Phase, string> = {
    idle: 'Mikrofona basılı tut, konuş',
    recording: `🔴 Dinliyorum... ${duration.toFixed(1)}s`,
    transcribing: 'Çeviriyorum...',
    thinking: 'Düşünüyorum...',
    speaking: 'Konuşuyorum (durdurmak için bas)',
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-950">
      {/* Üst — close butonu */}
      <View className="flex-row justify-between items-center px-5 pt-4">
        <Pressable onPress={handleClose} className="p-2">
          <Text className="text-white text-2xl">✕</Text>
        </Pressable>
        <Text className="text-white/70 text-sm font-semibold">SESLİ DERS</Text>
        <View className="w-10" />
      </View>

      {/* Orta — büyük dalga + AI metni */}
      <View className="flex-1 items-center justify-center px-6">
        <PulseOrb phase={phase} />

        {phase === 'speaking' && lastAITextDisplay ? (
          <Text
            className="text-white text-center mt-8 text-lg leading-7"
            numberOfLines={6}
            ellipsizeMode="tail"
          >
            {lastAITextDisplay}
          </Text>
        ) : phase === 'thinking' && streamingText ? (
          <Text className="text-white/80 text-center mt-8 text-base leading-6" numberOfLines={4}>
            {streamingText}
          </Text>
        ) : lastUserText && phase !== 'idle' ? (
          <Text className="text-white/60 text-center mt-8 italic" numberOfLines={2}>
            "{lastUserText}"
          </Text>
        ) : (
          <Text className="text-white/40 text-center mt-8">
            Aklına ne gelirse sor — Kavra dinliyor
          </Text>
        )}

        {error && <Text className="text-red-300 text-sm mt-4 text-center">⚠️ {error}</Text>}
      </View>

      {/* Alt — büyük mikrofon butonu */}
      <View className="items-center pb-10">
        <Text className="text-white/70 mb-4 text-sm">{phaseLabel[phase]}</Text>
        <Pressable
          onPressIn={handlePress}
          onPressOut={handleRelease}
          disabled={phase === 'transcribing' || phase === 'thinking'}
          className={[
            'w-24 h-24 rounded-full items-center justify-center',
            phase === 'recording'
              ? 'bg-red-500'
              : phase === 'speaking'
                ? 'bg-accent-500'
                : phase === 'idle'
                  ? 'bg-white'
                  : 'bg-white/30',
          ].join(' ')}
        >
          <Text style={{ fontSize: 40 }}>
            {phase === 'speaking'
              ? '⏸'
              : phase === 'recording'
                ? '🎤'
                : phase === 'idle'
                  ? '🎤'
                  : '⋯'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

/** Faz'a göre nabız atışı yapan büyük daire */
function PulseOrb({ phase }: { phase: Phase }) {
  const pulse = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null
    if (phase === 'recording' || phase === 'speaking' || phase === 'thinking') {
      const speed = phase === 'thinking' ? 1500 : 800
      anim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1.3,
              duration: speed,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 1,
              duration: speed,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: speed, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.4, duration: speed, useNativeDriver: true }),
          ]),
        ]),
      )
      anim.start()
    }
    return () => {
      anim?.stop()
      pulse.setValue(1)
      opacity.setValue(0.4)
    }
  }, [phase, pulse, opacity])

  const color =
    phase === 'recording'
      ? '#EF4444'
      : phase === 'speaking'
        ? '#F59E0B'
        : phase === 'thinking'
          ? '#818CF8'
          : '#FFFFFF'

  return (
    <View className="items-center justify-center">
      <Animated.View
        style={{
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: color,
          opacity,
          transform: [{ scale: pulse }],
        }}
      />
      <View
        className="absolute w-32 h-32 rounded-full items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <Text style={{ fontSize: 64 }}>
          {phase === 'recording'
            ? '🎤'
            : phase === 'speaking'
              ? '💬'
              : phase === 'thinking'
                ? '🧠'
                : phase === 'transcribing'
                  ? '✍️'
                  : '🎙️'}
        </Text>
      </View>
    </View>
  )
}
