import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
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
import {
  type Notebook,
  type NotebookMessage,
  type NotebookSource,
  useNotebookChat,
  useNotebookMessages,
} from '../../hooks/useNotebooks'
import { Icon } from '../ui/Icon'

interface Props {
  notebook: Notebook
  sources: NotebookSource[]
}

export function NotebookChatTab({ notebook, sources }: Props) {
  const router = useRouter()
  const { data: messages, isLoading } = useNotebookMessages(notebook.id)
  const chat = useNotebookChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages?.length, chat.isPending])

  const send = async () => {
    if (!input.trim() || chat.isPending) return
    const msg = input.trim()
    setInput('')

    try {
      await chat.mutateAsync({
        notebookId: notebook.id,
        message: msg,
        history: (messages ?? []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
      })
    } catch (e: any) {
      // Error UI inside chat ile gösterilebilir
      console.error(e)
    }
  }

  const readySources = sources.filter((s) => s.status === 'ready')
  const hasNoReadySources = sources.length > 0 && readySources.length === 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
      >
        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" style={{ marginTop: 40 }} />
        ) : !messages || messages.length === 0 ? (
          <EmptyState
            sourcesCount={readySources.length}
            hasNoReady={hasNoReadySources}
            onSuggestion={(s) => setInput(s)}
          />
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} sources={sources} notebookId={notebook.id} />
          ))
        )}

        {chat.isPending && (
          <View className="flex-row items-center gap-2 mt-3 ml-2">
            <View className="w-7 h-7 bg-ink-900 rounded-full items-center justify-center">
              <Icon name="sparkles" size={12} color="#F59E0B" />
            </View>
            <View className="flex-row items-center gap-1.5">
              <ActivityIndicator size="small" color="#1E1B4B" />
              <Text className="text-xs text-slate-500">Kaynakları okuyorum...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View className="px-4 pb-3 pt-2 bg-cream-50 border-t border-slate-100">
        <View className="bg-white border border-slate-200 rounded-2xl flex-row items-end p-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={hasNoReadySources ? 'Kaynaklar işleniyor...' : 'Kaynaklara bir şey sor...'}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={4000}
            editable={!hasNoReadySources}
            className="flex-1 px-2 py-1.5 text-base text-ink-900"
            style={{ maxHeight: 120 }}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || chat.isPending || hasNoReadySources}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              input.trim() && !chat.isPending ? 'bg-ink-900' : 'bg-slate-200'
            }`}
          >
            <Icon
              name="send"
              size={14}
              color={input.trim() && !chat.isPending ? '#F59E0B' : '#94A3B8'}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

function EmptyState({
  sourcesCount,
  hasNoReady,
  onSuggestion,
}: { sourcesCount: number; hasNoReady: boolean; onSuggestion: (s: string) => void }) {
  if (sourcesCount === 0) {
    return (
      <View className="py-8 px-4 items-center">
        <View className="w-16 h-16 bg-amber-50 rounded-full items-center justify-center mb-4">
          <Icon name="file" size={28} color="#F59E0B" />
        </View>
        <Text className="font-serif text-xl text-ink-900 text-center">Önce kaynak ekle</Text>
        <Text className="text-sm text-slate-500 text-center mt-2 max-w-[260px]">
          Kaynaklar sekmesinden bir PDF, URL, ses kaydı ya da metin ekle. Sonra ben hepsini öğrenip
          sorularını yanıtlarım :)
        </Text>
      </View>
    )
  }

  if (hasNoReady) {
    return (
      <View className="py-8 px-4 items-center">
        <ActivityIndicator color="#F59E0B" />
        <Text className="text-sm text-slate-600 text-center mt-3 max-w-[260px]">
          Kaynaklar işleniyor. Birkaç dakika içinde hazır olur.
        </Text>
      </View>
    )
  }

  const suggestions = [
    'Bu kaynakların ana fikri nedir?',
    'En önemli 3 noktayı özetle',
    'Bana bu konuyu basit anlat',
    'Sınavda çıkacak şeyleri söyle',
  ]

  return (
    <View className="py-6">
      <View className="items-center mb-5">
        <View
          className="w-16 h-16 bg-cream-100 rounded-full items-center justify-center mb-3"
          style={{ borderWidth: 1, borderColor: '#FBBF24' }}
        >
          <Icon name="message-square" size={28} color="#F59E0B" />
        </View>
        <Text className="font-serif text-xl text-ink-900">Kaynaklara sor!</Text>
        <Text className="text-xs text-slate-500 text-center mt-1.5">
          {sourcesCount} kaynak hazır. Cevaplarımda alıntı [[1]] formatında olur.
        </Text>
      </View>

      <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2 px-1">
        Önerilen sorular
      </Text>
      <View className="gap-2">
        {suggestions.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => onSuggestion(s)}
            className="bg-white border border-slate-100 rounded-2xl p-3"
          >
            <Text className="text-sm text-ink-900">{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function MessageBubble({
  message,
  sources,
  notebookId,
}: { message: NotebookMessage; sources: NotebookSource[]; notebookId: string }) {
  const router = useRouter()
  if (message.role === 'user') {
    return (
      <View className="items-end mb-3">
        <View className="bg-ink-900 rounded-3xl rounded-br-md px-4 py-2.5 max-w-[85%]">
          <Text className="text-cream-50 text-base leading-6">{message.content}</Text>
        </View>
      </View>
    )
  }

  // Assistant
  return (
    <View className="items-start mb-4">
      <View className="flex-row items-center gap-2 mb-1.5 ml-1">
        <View className="w-6 h-6 bg-ink-900 rounded-full items-center justify-center">
          <Icon name="sparkles" size={10} color="#F59E0B" />
        </View>
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">
          Kavra
        </Text>
      </View>
      <View className="bg-white border border-slate-100 rounded-3xl rounded-tl-md px-4 py-3 max-w-[88%]">
        <CitedText content={message.content} citations={message.citations} />
      </View>

      {message.citations && message.citations.length > 0 && (
        <View className="mt-2 ml-1 max-w-[88%]">
          <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-1.5">
            Kaynaklar ({message.citations.length})
          </Text>
          <View className="gap-1.5">
            {message.citations.slice(0, 5).map((c, i) => {
              const sourceObj = sources.find((s) => s.id === c.source_id)
              const isYoutube = sourceObj?.source_type === 'youtube' && c.start_time_ms != null
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    if (isYoutube && sourceObj) {
                      router.push(`/notebook/${notebookId}/source/${sourceObj.id}`)
                    }
                  }}
                  className={`bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex-row gap-2 ${isYoutube ? 'active:opacity-70' : ''}`}
                >
                  <View className="bg-amber-500 rounded-full w-5 h-5 items-center justify-center">
                    <Text className="text-[9px] text-ink-900 font-bold">{i + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] text-ink-900 font-semibold" numberOfLines={1}>
                      {c.source_title}
                      {c.page_number ? ` · s.${c.page_number}` : ''}
                      {c.start_time_ms != null ? ` · ${formatTimestamp(c.start_time_ms)}` : ''}
                    </Text>
                    <Text className="text-[10px] text-slate-600 mt-0.5" numberOfLines={2}>
                      {c.snippet}
                    </Text>
                  </View>
                  {isYoutube && <Icon name="play" size={12} color="#DB2777" />}
                </Pressable>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

/**
 * Render text with [[n]] citation markers as superscript pills.
 */
function CitedText({
  content,
  citations,
}: { content: string; citations: NotebookMessage['citations'] }) {
  const parts: Array<{ type: 'text' | 'cite'; value: string; n?: number }> = []
  const regex = /\[\[(\d+)\]\]/g
  let lastIdx = 0
  let m

  while ((m = regex.exec(content)) !== null) {
    if (m.index > lastIdx) {
      parts.push({ type: 'text', value: content.slice(lastIdx, m.index) })
    }
    parts.push({ type: 'cite', value: m[0], n: Number.parseInt(m[1]) })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIdx) })
  }

  return (
    <Text className="text-base text-ink-900 leading-6">
      {parts.map((p, i) =>
        p.type === 'text' ? (
          <Text key={i}>{p.value}</Text>
        ) : (
          <Text
            key={i}
            className="text-[10px] font-bold"
            style={{
              backgroundColor: '#F59E0B',
              color: '#1E1B4B',
              borderRadius: 4,
              paddingHorizontal: 4,
              paddingVertical: 1,
            }}
          >
            {p.n}
          </Text>
        ),
      )}
    </Text>
  )
}

function formatTimestamp(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const mm = Math.floor(sec / 60)
  const ss = sec % 60
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
}
