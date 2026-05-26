import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { type Book, useBooks } from '../../src/hooks/useBooks'

const PROUST_QUOTE =
  '"Bir kitap, bir kitaptan ibaret değildir, tıpkı bir insanın yalnızca insan olmadığı gibi. Kitap, eşsiz bir bireydi, kendinden başka var olma sebebi olmayan."'

export default function BooksLibrary() {
  const router = useRouter()
  const [tab, setTab] = useState<'reading' | 'not_started' | 'finished'>('reading')

  const { data: books, isLoading } = useBooks({ status: tab })

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Quote header */}
        <View className="mx-5 mt-4 bg-white border border-slate-100 rounded-3xl p-5">
          <Icon name="message-square" size={20} color="#94A3B8" />
          <Text className="font-serif italic text-base text-ink-900 leading-relaxed mt-3">
            {PROUST_QUOTE}
          </Text>
          <Text className="text-right text-slate-500 text-xs mt-3">— Marcel Proust</Text>
        </View>

        {/* Section header */}
        <View className="px-5 mt-6 flex-row items-center justify-between">
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">
            Benim Kitaplarım
          </Text>
          <Pressable onPress={() => router.push('/library/explore')}>
            <Icon name="chevron-right" size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View className="px-5 mt-3 flex-row gap-2">
          {[
            { v: 'reading' as const, l: 'Devam Ediyor' },
            { v: 'not_started' as const, l: 'Başlamadı' },
            { v: 'finished' as const, l: 'Tamamlanmış' },
          ].map((t) => (
            <Pressable
              key={t.v}
              onPress={() => setTab(t.v)}
              className={`px-4 py-2 rounded-full ${tab === t.v ? 'bg-ink-900' : 'bg-white border border-slate-200'}`}
            >
              <Text
                className={`text-xs font-bold ${tab === t.v ? 'text-cream-50' : 'text-slate-700'}`}
              >
                {t.l.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Books */}
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#1E1B4B" />
          </View>
        ) : !books || books.length === 0 ? (
          <EmptyState tab={tab} onAdd={() => router.push('/library/add')} />
        ) : (
          <View className="px-5 mt-4 gap-3">
            {books.map((b) => (
              <BookCard key={b.id} book={b} onPress={() => router.push(`/reader/${b.id}`)} />
            ))}
          </View>
        )}

        {/* Stats / quick actions */}
        <View className="px-5 mt-6">
          <Pressable
            onPress={() => router.push('/vocabulary')}
            className="bg-white border border-slate-100 rounded-2xl p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 bg-amber-50 rounded-xl items-center justify-center">
              <Icon name="book-open" size={20} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-ink-900 text-sm">Kelime Dağarcığım</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Öğrendiğin tüm sözcükler</Text>
            </View>
            <Icon name="chevron-right" size={18} color="#CBD5E1" />
          </Pressable>
        </View>

        {/* FAB */}
        <View className="absolute bottom-24 right-5">
          <Pressable
            onPress={() => router.push('/library/add')}
            className="w-14 h-14 bg-ink-900 rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: '#1E1B4B',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Icon name="plus" size={24} color="#F59E0B" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function BookCard({ book, onPress }: { book: Book; onPress: () => void }) {
  const minutesRead = Math.floor((book.total_reading_seconds ?? 0) / 60)
  const totalEst = book.estimated_minutes ?? 60
  const progressPct = Math.round((book.current_position ?? 0) * 100)

  const langFlag: Record<string, string> = {
    en: '🇬🇧',
    tr: '🇹🇷',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    it: '🇮🇹',
    ja: '🇯🇵',
    ar: '🇸🇦',
  }

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-3xl p-4 flex-row gap-4"
    >
      {/* Cover */}
      <View
        className="w-20 h-28 rounded-2xl overflow-hidden bg-emerald-50 items-center justify-center"
        style={{ borderWidth: 1, borderColor: '#A7F3D0' }}
      >
        {book.cover_url ? (
          <Image
            source={{ uri: book.cover_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="items-center px-1">
            <Text className="text-[8px] text-emerald-700 font-mono">
              {book.format.toUpperCase()}
            </Text>
            <Text
              className="font-serif text-emerald-900 text-center text-xs mt-1"
              numberOfLines={3}
            >
              {book.title}
            </Text>
          </View>
        )}
      </View>

      {/* Meta */}
      <View className="flex-1 justify-between">
        <View>
          <View className="flex-row items-center gap-1">
            <Text style={{ fontSize: 12 }}>{langFlag[book.language] ?? '📖'}</Text>
            <Text className="font-serif text-base text-ink-900 flex-1" numberOfLines={2}>
              {book.title}
            </Text>
          </View>
          {book.author && (
            <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
              {book.author}
            </Text>
          )}
        </View>

        <View>
          {book.estimated_minutes && (
            <View className="flex-row items-center gap-1.5 mb-1">
              <Icon name="clock" size={11} color="#94A3B8" />
              <Text className="text-[10px] text-slate-500">
                {minutesRead > 0
                  ? `${minutesRead} / ${totalEst} dk`
                  : `~${Math.round(totalEst / 60)} sa okuma`}
              </Text>
            </View>
          )}

          {book.status === 'reading' && (
            <>
              <View className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-[9px] font-mono text-slate-500">%{progressPct}</Text>
                {book.last_read_at && (
                  <Text className="text-[9px] text-slate-400">
                    {formatRelative(book.last_read_at)}
                  </Text>
                )}
              </View>
            </>
          )}

          {book.status === 'finished' && (
            <View className="flex-row items-center gap-1">
              <Icon name="check-circle" size={11} color="#10B981" />
              <Text className="text-[10px] text-emerald-700 font-semibold">Tamamlandı</Text>
            </View>
          )}
        </View>
      </View>

      <Icon name="chevron-right" size={18} color="#CBD5E1" />
    </Pressable>
  )
}

function EmptyState({ tab, onAdd }: { tab: string; onAdd: () => void }) {
  const messages: Record<string, { icon: string; title: string; desc: string; cta: string }> = {
    reading: {
      icon: 'book-open',
      title: 'Henüz okumaya başlamadın',
      desc: 'İlk kitabını ekle, dilini öğrenmeye başla',
      cta: 'Kitap Ekle',
    },
    not_started: {
      icon: 'bookmark',
      title: 'Bekleyen kitap yok',
      desc: 'Daha sonra okumak için kitap ekleyebilirsin',
      cta: 'Kitap Ekle',
    },
    finished: {
      icon: 'trophy',
      title: 'Henüz kitap bitirmedin',
      desc: 'Bitirdiğin kitaplar burada birikecek',
      cta: 'Devam Edenlere Bak',
    },
  }

  const m = messages[tab] ?? messages.reading

  return (
    <View className="px-5 mt-8 items-center">
      <View className="w-20 h-20 bg-cream-50 border-2 border-dashed border-slate-200 rounded-full items-center justify-center mb-4">
        <Icon name={m.icon} size={32} color="#94A3B8" />
      </View>
      <Text className="font-serif text-xl text-ink-900">{m.title}</Text>
      <Text className="text-sm text-slate-500 text-center mt-2 max-w-[280px]">{m.desc}</Text>
      <Pressable
        onPress={onAdd}
        className="mt-5 bg-ink-900 rounded-full px-6 py-3 flex-row items-center gap-2"
      >
        <Icon name="plus" size={16} color="#F59E0B" />
        <Text className="text-cream-50 font-semibold text-sm">{m.cta}</Text>
      </Pressable>
    </View>
  )
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (mins < 1) return 'şimdi'
  if (mins < 60) return `${mins}dk önce`
  if (hrs < 24) return `${hrs}sa önce`
  if (days < 7) return `${days}g önce`
  return d.toLocaleDateString('tr-TR')
}
