import { useQuery } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../src/components/ui/Icon'
import { apiFetch } from '../src/lib/api'

interface GalleryNotebook {
  id: string
  title: string
  description: string | null
  language: string
  category: string | null
  public_slug: string
  view_count: number
  save_count: number
  shared_at: string
  source_count: number
  total_words: number
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null }
}

const CATEGORIES = [
  { value: null, label: 'Hepsi', emoji: '✨' },
  { value: 'biology', label: 'Biyoloji', emoji: '🧬' },
  { value: 'chemistry', label: 'Kimya', emoji: '⚗️' },
  { value: 'physics', label: 'Fizik', emoji: '⚛️' },
  { value: 'history', label: 'Tarih', emoji: '🏛️' },
  { value: 'literature', label: 'Edebiyat', emoji: '📖' },
  { value: 'turkish', label: 'Türkçe', emoji: '🇹🇷' },
  { value: 'language', label: 'Yabancı Dil', emoji: '🌍' },
  { value: 'math', label: 'Matematik', emoji: '∑' },
  { value: 'cs', label: 'Bilgisayar', emoji: '💻' },
  { value: 'philosophy', label: 'Felsefe', emoji: '🤔' },
  { value: 'art', label: 'Sanat', emoji: '🎨' },
]

const SORTS = [
  { value: 'popular', label: 'Popüler' },
  { value: 'recent', label: 'Yeni' },
  { value: 'most-saved', label: 'En Çok Kaydedilen' },
] as const

export default function GalleryScreen() {
  const router = useRouter()
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('popular')

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', category, sort],
    queryFn: () =>
      apiFetch<{ notebooks: GalleryNotebook[]; categories: Record<string, number> }>(
        `/api/gallery?sort=${sort}${category ? `&category=${category}` : ''}`,
      ),
  })

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Pressable onPress={() => router.back()} className="mb-2">
          <Icon name="chevron-left" size={20} color="#1E1B4B" />
        </Pressable>
        <Text className="font-serif text-3xl text-ink-900">Keşfet</Text>
        <Text className="text-sm text-slate-600 mt-1">
          Topluluğun paylaştığı defterler. Beğendiğini kaydet, klonla, çalış.
        </Text>
      </View>

      {/* Sort tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5 mt-3 mb-2"
        contentContainerStyle={{ gap: 8 }}
      >
        {SORTS.map((s) => (
          <Pressable
            key={s.value}
            onPress={() => setSort(s.value)}
            className={`px-3 py-1.5 rounded-full border ${
              sort === s.value ? 'bg-ink-900 border-ink-900' : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${sort === s.value ? 'text-cream-50' : 'text-slate-600'}`}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5 mb-3"
        contentContainerStyle={{ gap: 6 }}
      >
        {CATEGORIES.map((c) => {
          const count = c.value ? (data?.categories?.[c.value] ?? 0) : null
          return (
            <Pressable
              key={c.value ?? 'all'}
              onPress={() => setCategory(c.value)}
              className={`px-2.5 py-1.5 rounded-full border flex-row items-center gap-1 ${
                category === c.value ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-200'
              }`}
            >
              <Text className="text-[12px]">{c.emoji}</Text>
              <Text
                className={`text-[11px] font-semibold ${category === c.value ? 'text-ink-900' : 'text-slate-600'}`}
              >
                {c.label}
              </Text>
              {count !== null && count > 0 && (
                <Text
                  className={`text-[9px] font-mono ${category === c.value ? 'text-ink-900/60' : 'text-slate-400'}`}
                >
                  {count}
                </Text>
              )}
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Notebook list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F59E0B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {(data?.notebooks ?? []).map((n) => (
            <Pressable
              key={n.id}
              onPress={() => router.push(`/n/${n.public_slug}`)}
              className="bg-white border border-slate-100 rounded-3xl p-4 mb-3"
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 pr-2">
                  <Text className="font-serif text-lg text-ink-900" numberOfLines={2}>
                    {n.title}
                  </Text>
                  {n.description && (
                    <Text className="text-xs text-slate-500 mt-1" numberOfLines={2}>
                      {n.description}
                    </Text>
                  )}
                </View>
                {n.category && (
                  <View className="bg-cream-50 rounded-full px-2 py-1">
                    <Text className="text-[10px] font-mono text-slate-700">{n.category}</Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-3 mt-2">
                <Text className="text-[10px] text-slate-500">
                  @{n.profiles?.username ?? 'anonim'}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Icon name="eye" size={11} color="#94A3B8" />
                  <Text className="text-[10px] text-slate-500 font-mono">{n.view_count}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Icon name="bookmark" size={11} color="#F59E0B" />
                  <Text className="text-[10px] text-slate-500 font-mono">{n.save_count}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Icon name="file-text" size={11} color="#94A3B8" />
                  <Text className="text-[10px] text-slate-500 font-mono">{n.source_count}</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {(data?.notebooks ?? []).length === 0 && (
            <View className="items-center py-16">
              <Text className="text-3xl mb-3">📚</Text>
              <Text className="font-serif text-lg text-slate-700">Henüz defter yok</Text>
              <Text className="text-sm text-slate-500 mt-1 text-center">
                Bu kategoride henüz paylaşılan defter yok.{'\n'}İlk paylaşan sen ol!
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
