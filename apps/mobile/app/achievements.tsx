import { useQuery } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../src/components/ui/Icon'
import { apiFetch } from '../src/lib/api'

const RARITY_COLORS: Record<string, string> = {
  common: '#94A3B8',
  rare: '#0891B2',
  epic: '#7C3AED',
  legendary: '#F59E0B',
}

const CATEGORIES = [
  { value: 'milestone', label: 'Kilometre Taşı' },
  { value: 'learning', label: 'Öğrenme' },
  { value: 'streak', label: 'Streak' },
  { value: 'creator', label: 'Yaratıcı' },
  { value: 'social', label: 'Sosyal' },
]

export default function AchievementsScreen() {
  const router = useRouter()
  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => apiFetch<any>('/api/achievements'),
  })

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#F59E0B" />
      </SafeAreaView>
    )
  }

  const all = data?.achievements ?? []

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="mb-2">
          <Icon name="chevron-left" size={20} color="#1E1B4B" />
        </Pressable>
        <Text className="font-serif text-3xl text-ink-900">Rozetler</Text>
        <Text className="text-sm text-slate-600 mt-1">
          {data?.unlockedCount ?? 0} / {data?.totalCount ?? 0} kazanıldı
        </Text>
        <View className="h-2 bg-white rounded-full mt-3 overflow-hidden">
          <View
            className="h-full bg-amber-500"
            style={{
              width: `${((data?.unlockedCount ?? 0) / Math.max(1, data?.totalCount ?? 1)) * 100}%`,
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {CATEGORIES.map((cat) => {
          const items = all.filter((a: any) => a.category === cat.value)
          if (items.length === 0) return null

          return (
            <View key={cat.value} className="mb-6">
              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                {cat.label} ({items.filter((a: any) => a.isUnlocked).length}/{items.length})
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {items.map((a: any) => (
                  <View
                    key={a.id}
                    className="bg-white rounded-2xl p-3 border-2 items-center"
                    style={{
                      width: '31%',
                      borderColor: a.isUnlocked ? RARITY_COLORS[a.rarity] : '#F1F5F9',
                      opacity: a.isUnlocked ? 1 : 0.4,
                    }}
                  >
                    <Text className="text-3xl">{a.isUnlocked ? a.emoji : '🔒'}</Text>
                    <Text
                      className="text-[10px] text-ink-900 font-bold mt-1.5 text-center"
                      numberOfLines={2}
                    >
                      {a.name}
                    </Text>
                    <Text
                      className="text-[8px] text-slate-500 mt-0.5 text-center"
                      numberOfLines={2}
                    >
                      {a.description}
                    </Text>
                    <View
                      className="rounded-full px-1.5 py-0.5 mt-1.5"
                      style={{ backgroundColor: RARITY_COLORS[a.rarity] + '20' }}
                    >
                      <Text
                        className="text-[8px] font-bold uppercase"
                        style={{ color: RARITY_COLORS[a.rarity] }}
                      >
                        {a.rarity}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
