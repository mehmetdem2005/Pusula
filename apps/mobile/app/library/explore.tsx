import { Stack, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { type Book, useBooks } from '../../src/hooks/useBooks'

const STATUS_FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'reading', label: 'Okunuyor' },
  { key: 'not_started', label: 'Başlanmadı' },
  { key: 'finished', label: 'Bitti' },
] as const

const LANG_FLAG: Record<string, string> = {
  en: '🇬🇧',
  tr: '🇹🇷',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
  ja: '🇯🇵',
  ar: '🇸🇦',
}

export default function LibraryExplore() {
  const router = useRouter()
  const { data: books, isLoading } = useBooks()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]['key']>('all')

  const filtered = useMemo(() => {
    let list = books ?? []
    if (status !== 'all') list = list.filter((b) => b.status === status)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [books, status, query])

  const openBook = (b: Book) => {
    if (b.format === 'pdf') router.push(`/reader-pdf/${b.id}`)
    else router.push(`/reader/${b.id}`)
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen
        options={{ title: 'Kitap Keşfet', headerStyle: { backgroundColor: '#FBF8F0' } }}
      />

      {/* Header + arama */}
      <View className="px-5 pt-3 pb-2">
        <Text className="font-serif text-2xl text-ink-900 mb-3">Kitaplığım</Text>
        <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 gap-2">
          <Icon name="search" size={16} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Başlık veya yazar ara…"
            placeholderTextColor="#94A3B8"
            className="flex-1 text-base text-ink-900"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x-circle" size={16} color="#CBD5E1" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Durum filtreleri */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-grow-0"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
      >
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key
          return (
            <Pressable
              key={f.key}
              onPress={() => setStatus(f.key)}
              className={`px-4 py-1.5 rounded-full border ${
                active ? 'bg-ink-900 border-ink-900' : 'bg-white border-slate-200'
              }`}
            >
              <Text className={`text-xs font-medium ${active ? 'text-cream-50' : 'text-slate-600'}`}>
                {f.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E1B4B" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-cream-100 rounded-full items-center justify-center mb-3">
            <Icon name="book-open" size={28} color="#94A3B8" />
          </View>
          <Text className="text-base text-ink-900 font-semibold">
            {query || status !== 'all' ? 'Sonuç yok' : 'Kitaplığın boş'}
          </Text>
          <Text className="text-sm text-slate-500 text-center mt-1 max-w-[260px]">
            {query || status !== 'all'
              ? 'Filtreyi değiştir ya da yeni kitap ekle.'
              : 'İlk kitabını ekleyerek başla.'}
          </Text>
          <Pressable
            onPress={() => router.push('/library/add')}
            className="mt-5 bg-ink-900 rounded-full px-6 py-3 flex-row items-center gap-2"
          >
            <Icon name="plus" size={16} color="#F59E0B" />
            <Text className="text-cream-50 font-semibold text-sm">Kitap Ekle</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}
        >
          {filtered.map((b) => {
            const progressPct = Math.round((b.current_position ?? 0) * 100)
            return (
              <Pressable
                key={b.id}
                onPress={() => openBook(b)}
                className="bg-white border border-slate-100 rounded-3xl p-4 flex-row gap-4"
              >
                <View
                  className="w-16 h-24 rounded-2xl overflow-hidden bg-emerald-50 items-center justify-center"
                  style={{ borderWidth: 1, borderColor: '#A7F3D0' }}
                >
                  {b.cover_url ? (
                    <Image
                      source={{ uri: b.cover_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="items-center px-1">
                      <Text className="text-[8px] text-emerald-700 font-mono">
                        {b.format.toUpperCase()}
                      </Text>
                      <Text
                        className="font-serif text-emerald-900 text-center text-[11px] mt-1"
                        numberOfLines={3}
                      >
                        {b.title}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-1 justify-between py-0.5">
                  <View>
                    <Text className="font-serif text-base text-ink-900" numberOfLines={2}>
                      {b.title}
                    </Text>
                    {b.author && (
                      <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                        {b.author}
                      </Text>
                    )}
                    <View className="flex-row items-center gap-2 mt-1.5">
                      <Text className="text-[11px]">{LANG_FLAG[b.language] ?? '🌐'}</Text>
                      <Text className="text-[10px] font-mono text-slate-400 uppercase">
                        {b.format}
                      </Text>
                    </View>
                  </View>

                  {b.status !== 'not_started' && (
                    <View className="mt-2">
                      <View className="h-1 bg-slate-100 rounded-full">
                        <View
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </View>
                      <Text className="text-[10px] text-slate-400 mt-1">
                        {b.status === 'finished' ? 'Bitti' : `%${progressPct}`}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
