import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NotebookChatTab } from '../../src/components/notebook/NotebookChatTab'
import { NotebookSourcesTab } from '../../src/components/notebook/NotebookSourcesTab'
import { NotebookStudioTab } from '../../src/components/notebook/NotebookStudioTab'
import { Icon } from '../../src/components/ui/Icon'
import { useNotebook } from '../../src/hooks/useNotebooks'

type Tab = 'sources' | 'chat' | 'studio'

export default function NotebookDetail() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = useNotebook(id ?? null)
  const [tab, setTab] = useState<Tab>('chat')

  if (isLoading || !data) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3 bg-cream-50 border-b border-slate-100">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Icon name="chevron-left" size={24} color="#1E1B4B" />
        </Pressable>
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${data.notebook.color}22` }}
        >
          <Text style={{ fontSize: 20 }}>{data.notebook.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-serif text-base text-ink-900" numberOfLines={1}>
            {data.notebook.title}
          </Text>
          <Text className="text-[10px] text-slate-500 font-mono">
            {data.sources.length} kaynak · {data.notebook.message_count} mesaj
          </Text>
        </View>
        <Pressable onPress={() => router.push(`/notebook/${id}/settings`)} hitSlop={12}>
          <Icon name="settings" size={20} color="#64748B" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-cream-50 border-b border-slate-100">
        <TabBtn
          active={tab === 'sources'}
          icon="file"
          label="Kaynaklar"
          badge={data.sources.length}
          onPress={() => setTab('sources')}
        />
        <TabBtn
          active={tab === 'chat'}
          icon="message-square"
          label="Sohbet"
          onPress={() => setTab('chat')}
        />
        <TabBtn
          active={tab === 'studio'}
          icon="sparkles"
          label="Studio"
          badge={data.generatedContent.length || undefined}
          onPress={() => setTab('studio')}
        />
      </View>

      {/* Content */}
      {tab === 'sources' && <NotebookSourcesTab notebook={data.notebook} sources={data.sources} />}
      {tab === 'chat' && <NotebookChatTab notebook={data.notebook} sources={data.sources} />}
      {tab === 'studio' && (
        <NotebookStudioTab
          notebook={data.notebook}
          sources={data.sources}
          generatedContent={data.generatedContent}
        />
      )}
    </SafeAreaView>
  )
}

function TabBtn({
  active,
  icon,
  label,
  badge,
  onPress,
}: { active: boolean; icon: any; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-3.5 items-center flex-row justify-center gap-1.5 ${
        active ? 'border-b-2 border-ink-900' : ''
      }`}
    >
      <Icon name={icon} size={14} color={active ? '#1E1B4B' : '#94A3B8'} />
      <Text className={`text-xs font-bold ${active ? 'text-ink-900' : 'text-slate-500'}`}>
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View className="bg-amber-500 rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center">
          <Text className="text-[10px] text-ink-900 font-bold">{badge}</Text>
        </View>
      )}
    </Pressable>
  )
}
