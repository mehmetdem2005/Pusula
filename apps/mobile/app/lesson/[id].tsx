import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChatInput } from '../../src/components/chat/ChatInput'
import { EngineBadge } from '../../src/components/chat/EngineBadge'
import { MessageBubble } from '../../src/components/chat/MessageBubble'
import { ModelPickerModal } from '../../src/components/chat/ModelPickerModal'
import { PersonalityPickerModal } from '../../src/components/chat/PersonalityPickerModal'
import { RateLessonModal } from '../../src/components/lesson/RateLessonModal'
import { useLesson, useMessages, useRateLesson, useSendMessage } from '../../src/hooks/useLessons'
import type { LLMModel } from '../../src/hooks/useModels'
import type { Personality } from '../../src/hooks/useSubjects'
import { useTTS } from '../../src/hooks/useTTS'
import { supabase } from '../../src/lib/supabase'

export default function LessonChat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: lesson } = useLesson(id ?? null)
  const { data: messages, isLoading } = useMessages(id ?? null)
  const { send, cancel, streamingText, isStreaming, error, engineMeta } = useSendMessage(id ?? null)
  const rateLesson = useRateLesson()
  const scrollRef = useRef<ScrollView>(null)

  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [personalityPickerOpen, setPersonalityPickerOpen] = useState(false)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [activeModelLabel, setActiveModelLabel] = useState<string>('Auto')
  const [activePersonality, setActivePersonality] = useState<Personality | null>(null)
  const [autoTTS, setAutoTTS] = useState(false)

  const { speak, stop: stopTTS, isSpeaking } = useTTS({ language: 'tr', mode: 'auto' })
  const lastReadIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (messages?.length || streamingText) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    }
  }, [messages?.length, streamingText])

  useEffect(() => {
    if (!autoTTS || !messages || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    if (last.id === lastReadIdRef.current) return
    if (isStreaming) return
    lastReadIdRef.current = last.id
    speak(last.content)
  }, [messages, autoTTS, isStreaming, speak])

  const handleModelSelect = (m: LLMModel) => {
    setActiveModelId(m.id)
    setActiveModelLabel(m.display_name)
    if (id) void supabase.from('lessons').update({ model_id: m.id }).eq('id', id)
  }

  const handlePersonalitySelect = (p: Personality) => {
    setActivePersonality(p)
    if (id) void supabase.from('lessons').update({ personality_id: p.id }).eq('id', id)
  }

  const handleSend = (text: string) => send(text, activeModelId ?? undefined)

  const toggleTTS = () => {
    if (isSpeaking) stopTTS()
    setAutoTTS((v) => !v)
  }

  const handleEndLesson = () => {
    // Yeterince mesaj varsa rating iste
    if ((messages?.length ?? 0) >= 3) {
      setRatingModalOpen(true)
    } else {
      router.back()
    }
  }

  const submitRating = (rating: number, _note?: string) => {
    if (!id) return
    rateLesson.mutate(
      { lessonId: id, rating, completed: true },
      {
        onSuccess: () => {
          setRatingModalOpen(false)
          router.back()
        },
        onError: (e: any) => {
          Alert.alert('Hata', e.message)
          setRatingModalOpen(false)
        },
      },
    )
  }

  const isEmpty = !isLoading && (!messages || messages.length === 0)

  return (
    <SafeAreaView className="flex-1 bg-ink-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Kavra',
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
          headerRight: () => (
            <View className="flex-row gap-1">
              <Pressable onPress={() => router.push(`/voice-lesson/${id}`)} className="px-2 py-1">
                <Text style={{ fontSize: 20 }}>🎙️</Text>
              </Pressable>
              <Pressable
                onPress={toggleTTS}
                className={`px-2 py-1 ${autoTTS ? 'bg-brand-50 rounded-lg' : ''}`}
              >
                <Text style={{ fontSize: 20 }}>{autoTTS ? '🔊' : '🔇'}</Text>
              </Pressable>
              <Pressable onPress={handleEndLesson} className="px-2 py-1">
                <Text style={{ fontSize: 16, color: '#1E1B4B', fontWeight: '600' }}>Bitir</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Aktif model + kişilik şeridi */}
      <View className="bg-white border-b border-slate-100 px-4 py-2 flex-row gap-2">
        <Pressable
          onPress={() => setModelPickerOpen(true)}
          className="flex-row items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full"
        >
          <Text className="text-xs text-slate-500">Model:</Text>
          <Text className="text-xs font-semibold text-brand-950">{activeModelLabel}</Text>
          <Text className="text-xs text-slate-400 ml-1">▾</Text>
        </Pressable>
        <Pressable
          onPress={() => setPersonalityPickerOpen(true)}
          className="flex-row items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full"
        >
          <Text className="text-xs text-slate-500">Kişilik:</Text>
          <Text className="text-xs font-semibold text-brand-950">
            {activePersonality?.emoji} {activePersonality?.name ?? 'Varsayılan'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Engine kararını göster */}
          {engineMeta && !isEmpty && (
            <EngineBadge
              meta={engineMeta}
              onPress={() => {
                Alert.alert(
                  'Engine Kararı',
                  `Context: ${engineMeta.context}\n` +
                    `Intent: ${engineMeta.intent}\n` +
                    `Teknik: ${engineMeta.techniqueName}\n` +
                    `Aktif davranışlar:\n${engineMeta.activeBehaviors.map((b) => `• ${b}`).join('\n')}` +
                    (engineMeta.hasRAG
                      ? `\n\n${engineMeta.ragSources.length} referans kullanıldı`
                      : ''),
                )
              }}
            />
          )}

          {isLoading ? (
            <ActivityIndicator color="#1E1B4B" style={{ marginVertical: 80 }} />
          ) : isEmpty ? (
            <EmptyState onVoiceMode={() => router.push(`/voice-lesson/${id}`)} />
          ) : (
            messages?.map((m) => (
              <Pressable key={m.id} onLongPress={() => m.role === 'assistant' && speak(m.content)}>
                <MessageBubble role={m.role as any} content={m.content} />
              </Pressable>
            ))
          )}

          {isStreaming && streamingText && (
            <MessageBubble role="assistant" content={streamingText} streaming />
          )}

          {error && (
            <View className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <Text className="text-red-700 text-sm">⚠️ {error}</Text>
            </View>
          )}
        </ScrollView>

        <ChatInput
          onSend={handleSend}
          onCancel={cancel}
          isStreaming={isStreaming}
          lessonId={id}
          voiceLanguage="tr"
        />
      </KeyboardAvoidingView>

      <ModelPickerModal
        visible={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        selectedModelId={activeModelId}
        onSelect={handleModelSelect}
      />
      <PersonalityPickerModal
        visible={personalityPickerOpen}
        onClose={() => setPersonalityPickerOpen(false)}
        selectedId={activePersonality?.id ?? null}
        onSelect={handlePersonalitySelect}
      />
      <RateLessonModal
        visible={ratingModalOpen}
        techniqueName={(lesson as any)?.techniques?.name ?? engineMeta?.techniqueName}
        onClose={() => {
          setRatingModalOpen(false)
          router.back()
        }}
        onSubmit={submitRating}
        submitting={rateLesson.isPending}
      />
    </SafeAreaView>
  )
}

function EmptyState({ onVoiceMode }: { onVoiceMode: () => void }) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <Text style={{ fontSize: 48 }}>💬</Text>
      <Text className="text-lg font-serif text-brand-950 mt-4">Neyi kavramak istersin?</Text>
      <Text className="text-slate-500 text-center mt-2 leading-6">
        Sorunu yaz, Kavra 150 tekniğin en uygun olanıyla anlatsın.
      </Text>

      <Pressable
        onPress={onVoiceMode}
        className="mt-6 bg-brand-950 px-5 py-3 rounded-full flex-row items-center gap-2"
      >
        <Text style={{ fontSize: 18 }}>🎙️</Text>
        <Text className="text-white font-semibold">Sesli Derse Geç</Text>
      </Pressable>

      <View className="mt-8 w-full gap-2">
        <Text className="text-xs font-semibold text-slate-400 uppercase mb-1">Deneme soruları</Text>
        <Suggestion text="Fotosentezi 5. sınıf çocuğuna anlat" />
        <Suggestion text="Türev nedir? Feynman tekniğiyle" />
        <Suggestion text="Almanca A2 için 10 soruluk sınav" />
      </View>
    </View>
  )
}

function Suggestion({ text }: { text: string }) {
  return (
    <View className="bg-white border border-slate-100 rounded-xl p-3">
      <Text className="text-brand-950 text-sm">{text}</Text>
    </View>
  )
}
