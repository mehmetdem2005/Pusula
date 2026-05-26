import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChatInput } from '../../src/components/chat/ChatInput'
import { MessageBubble } from '../../src/components/chat/MessageBubble'
import { ModelPickerModal } from '../../src/components/chat/ModelPickerModal'
import { PersonalityPickerModal } from '../../src/components/chat/PersonalityPickerModal'
import { useLesson, useMessages, useSendMessage } from '../../src/hooks/useLessons'
import type { LLMModel } from '../../src/hooks/useModels'
import type { Personality } from '../../src/hooks/useSubjects'
import { supabase } from '../../src/lib/supabase'

export default function LessonChat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: lesson } = useLesson(id ?? null)
  const { data: messages, isLoading } = useMessages(id ?? null)
  const { send, cancel, streamingText, isStreaming, error } = useSendMessage(id ?? null)
  const scrollRef = useRef<ScrollView>(null)

  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [personalityPickerOpen, setPersonalityPickerOpen] = useState(false)
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [activeModelLabel, setActiveModelLabel] = useState<string>('Llama 3.3 70B')
  const [activePersonality, setActivePersonality] = useState<Personality | null>(null)

  useEffect(() => {
    if (messages?.length || streamingText) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    }
  }, [messages?.length, streamingText])

  const handleModelSelect = (m: LLMModel) => {
    setActiveModelId(m.id)
    setActiveModelLabel(m.display_name)
    if (id) {
      void supabase.from('lessons').update({ model_id: m.id }).eq('id', id)
    }
  }

  const handlePersonalitySelect = (p: Personality) => {
    setActivePersonality(p)
    if (id) {
      void supabase.from('lessons').update({ personality_id: p.id }).eq('id', id)
    }
  }

  const handleSend = (text: string) => {
    send(text, activeModelId ?? undefined)
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
              <Pressable
                onPress={() => setPersonalityPickerOpen(true)}
                className="px-2 py-1 rounded-lg"
              >
                <Text style={{ fontSize: 20 }}>{activePersonality?.emoji ?? '🎭'}</Text>
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
          <Text className="text-xs text-slate-400 ml-1">▾</Text>
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
          {isLoading ? (
            <View className="py-20 items-center">
              <ActivityIndicator color="#1E1B4B" />
            </View>
          ) : isEmpty ? (
            <EmptyState />
          ) : (
            messages?.map((m) => (
              <MessageBubble key={m.id} role={m.role as any} content={m.content} />
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

        <ChatInput onSend={handleSend} onCancel={cancel} isStreaming={isStreaming} />
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
    </SafeAreaView>
  )
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <Text style={{ fontSize: 48 }}>💬</Text>
      <Text className="text-lg font-serif text-brand-950 mt-4">Neyi kavramak istersin?</Text>
      <Text className="text-slate-500 text-center mt-2 leading-6">
        Aşağıdan sorunu yaz, Kavra senin için 150 tekniğin en uygun olanıyla anlatsın.
      </Text>

      <View className="mt-8 w-full gap-2">
        <Text className="text-xs font-semibold text-slate-400 uppercase mb-1">Denemek için</Text>
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
