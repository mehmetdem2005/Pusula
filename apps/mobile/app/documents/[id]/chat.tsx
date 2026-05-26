import { Stack, useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../../src/components/ui/Icon'
import { type DocChatCitation, useDocumentChat } from '../../../src/hooks/useDocuments'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations?: DocChatCitation[]
}

export default function DocumentChat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chat = useDocumentChat()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  const send = async () => {
    const question = input.trim()
    if (!question || !id || chat.isPending) return
    setInput('')
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: question }
    setMessages((m) => [...m, userMsg])
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))

    try {
      const res = await chat.mutateAsync({ documentId: id, question })
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.answer || 'Cevap üretilemedi.',
          citations: res.citations,
        },
      ])
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text:
            e?.message === 'not_processed'
              ? 'Bu doküman henüz işlenmemiş. Önce "İşle / Özetle" adımını çalıştır.'
              : `Hata: ${e?.message ?? 'cevap alınamadı'}`,
        },
      ])
    }
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['bottom']}>
      <Stack.Screen
        options={{ title: 'Dokümana Sor', headerStyle: { backgroundColor: '#FBF8F0' } }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 12 }}
        >
          {messages.length === 0 && (
            <View className="items-center pt-16 px-8">
              <View className="w-16 h-16 bg-amber-50 rounded-full items-center justify-center mb-3">
                <Icon name="message-circle" size={28} color="#F59E0B" />
              </View>
              <Text className="font-serif text-lg text-ink-900 text-center">
                Bu doküman hakkında sor
              </Text>
              <Text className="text-sm text-slate-500 text-center mt-1">
                Cevaplar yalnızca dokümandan üretilir, kaynak sayfa belirtilir.
              </Text>
            </View>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} className="self-end max-w-[85%] bg-ink-900 rounded-2xl rounded-br-md px-4 py-2.5">
                <Text className="text-cream-50 text-[15px] leading-5">{m.text}</Text>
              </View>
            ) : (
              <View key={m.id} className="self-start max-w-[90%] bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                <Text className="text-ink-900 text-[15px] leading-6">{m.text}</Text>
                {m.citations && m.citations.length > 0 && (
                  <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                    {Array.from(new Set(m.citations.map((c) => c.page)))
                      .filter((p): p is number => p != null)
                      .slice(0, 6)
                      .map((p) => (
                        <View key={p} className="bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          <Text className="text-[10px] font-mono text-amber-700">Sayfa {p}</Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            ),
          )}

          {chat.isPending && (
            <View className="self-start bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#1E1B4B" />
              <Text className="text-slate-400 text-sm">Dokümanı okuyor…</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="flex-row items-end gap-2 px-3 py-2.5 border-t border-slate-100 bg-white">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Bir soru yaz…"
            placeholderTextColor="#94A3B8"
            multiline
            className="flex-1 max-h-28 bg-cream-50 rounded-2xl px-4 py-2.5 text-[15px] text-ink-900"
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || chat.isPending}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              input.trim() && !chat.isPending ? 'bg-ink-900' : 'bg-slate-200'
            }`}
          >
            <Icon name="arrow-right" size={20} color={input.trim() ? '#F59E0B' : '#94A3B8'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
