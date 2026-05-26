import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDueFlashcards, useReviewStats } from '../../src/hooks/useReview'

export default function ReviewTab() {
  const router = useRouter()
  const { data: stats, isLoading: sLoading } = useReviewStats()
  const { data: due, isLoading: dLoading } = useDueFlashcards()

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-3xl font-serif text-brand-950">Tekrar</Text>
        <Text className="text-slate-500 mt-1 mb-6">Aralıklı tekrar ile bilgini kalıcı yap.</Text>

        {/* Stats */}
        {sLoading ? (
          <ActivityIndicator color="#1E1B4B" />
        ) : stats ? (
          <View className="flex-row gap-3 mb-6">
            <StatCard label="Bugün" value={String(stats.todayReviews)} emoji="📅" />
            <StatCard label="Bu Hafta" value={String(stats.weekReviews)} emoji="📈" />
            <StatCard label="Toplam Kart" value={String(stats.totalCards)} emoji="🃏" />
          </View>
        ) : null}

        {/* Hazır kartlar */}
        <View className="bg-brand-950 rounded-3xl p-5 mb-6">
          <Text className="text-white/70 text-sm">Şu an çalışılması gereken</Text>
          <View className="flex-row items-end gap-2 mt-1 mb-3">
            <Text className="text-white text-5xl font-bold">
              {dLoading ? '...' : (due?.length ?? 0)}
            </Text>
            <Text className="text-white/80 mb-2">kart</Text>
          </View>

          <Pressable
            onPress={() => router.push('/review/session')}
            disabled={!due || due.length === 0}
            className={[
              'px-5 py-3 rounded-full flex-row items-center justify-center gap-2',
              due && due.length > 0 ? 'bg-accent-500' : 'bg-white/20',
            ].join(' ')}
          >
            <Text className="text-white font-bold text-base">
              {due && due.length > 0 ? 'Tekrara Başla →' : 'Hepsi tamam!'}
            </Text>
          </Pressable>
        </View>

        {/* Hata listesine kısa link */}
        <Pressable
          onPress={() => router.push('/errors')}
          className="bg-white border border-slate-100 rounded-2xl p-4 flex-row items-center gap-3 mb-3 active:opacity-70"
        >
          <Text style={{ fontSize: 28 }}>🔍</Text>
          <View className="flex-1">
            <Text className="font-semibold text-brand-950">Hata Portföyüm</Text>
            <Text className="text-slate-500 text-xs">
              Tekrarlanan yanlışlardan 5 Neden ile öğren
            </Text>
          </View>
          <Text className="text-slate-400 text-xl">›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/learn')}
          className="bg-white border border-slate-100 rounded-2xl p-4 flex-row items-center gap-3 mb-8 active:opacity-70"
        >
          <Text style={{ fontSize: 28 }}>📝</Text>
          <View className="flex-1">
            <Text className="font-semibold text-brand-950">Quiz Üret</Text>
            <Text className="text-slate-500 text-xs">Bir konuya gir, "Quiz" butonuna bas</Text>
          </View>
          <Text className="text-slate-400 text-xl">›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 items-center">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text className="text-2xl font-bold text-brand-950 mt-1">{value}</Text>
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  )
}
