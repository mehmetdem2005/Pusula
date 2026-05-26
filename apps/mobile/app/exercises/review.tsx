import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KaraokeTTSPlayer } from '../../src/components/reader/KaraokeTTSPlayer'
import { Icon } from '../../src/components/ui/Icon'
import {
  type VocabSRSCard,
  useRateVocabCard,
  useVocabPreview,
  useVocabQueue,
} from '../../src/hooks/useVocabReview'

export default function VocabReviewSession() {
  const router = useRouter()
  const { data, isLoading, refetch } = useVocabQueue({ limit: 30 })
  const rate = useRateVocabCard()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState({ done: 0, again: 0, good: 0 })
  const startTimeRef = useRef(Date.now())

  const cards = data?.cards ?? []
  const card = cards[currentIdx]
  const total = cards.length

  const { data: preview } = useVocabPreview(card?.id ?? null)

  useEffect(() => {
    startTimeRef.current = Date.now()
    setRevealed(false)
  }, [currentIdx, card?.id])

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    if (!card) return
    const durationMs = Date.now() - startTimeRef.current
    try {
      await rate.mutateAsync({ cardId: card.id, rating, durationMs })

      setStats((s) => ({
        done: s.done + 1,
        again: s.again + (rating === 1 ? 1 : 0),
        good: s.good + (rating >= 3 ? 1 : 0),
      }))

      if (currentIdx + 1 >= total) {
        // Bitti, gerekirse refetch
        const fresh = await refetch()
        if (fresh.data && fresh.data.cards.length > 0) {
          setCurrentIdx(0)
        }
      } else {
        setCurrentIdx((i) => i + 1)
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  if (!card) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <Stack.Screen options={{ title: 'Tekrar', headerStyle: { backgroundColor: '#FBF8F0' } }} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-4">
            <Icon name="check-circle" size={40} color="#10B981" />
          </View>
          <Text className="font-serif text-2xl text-ink-900">Tüm kartlar bitti :)</Text>
          <Text className="text-sm text-slate-500 text-center mt-2 max-w-[280px]">
            Bugünlük tekrar etmen gereken kart yok. Yeni kelime öğren ya da yarın gel.
          </Text>
          <Pressable
            onPress={() => router.replace('/library')}
            className="mt-6 bg-ink-900 rounded-full px-6 py-3 flex-row items-center gap-2"
          >
            <Icon name="book-open" size={16} color="#F59E0B" />
            <Text className="text-cream-50 font-semibold text-sm">Kitap Aç</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const v = card.user_vocabulary
  const trans = (v.translations as any[])?.[0]?.translations?.[0] ?? ''
  const progress = ((currentIdx + 1) / total) * 100

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: `${currentIdx + 1} / ${total}`,
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'JetBrainsMono', fontSize: 14 },
        }}
      />

      {/* Progress bar */}
      <View className="px-4 pt-2">
        <View className="h-1 bg-slate-200 rounded-full">
          <View className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <View className="flex-1 px-5 pt-6">
        {/* Card */}
        <View className="bg-white border border-slate-100 rounded-3xl p-6 flex-1 justify-between">
          <View>
            {/* Card type badge */}
            <View className="flex-row items-center gap-2 mb-4">
              <View className="bg-ink-900 rounded-full px-2.5 py-1">
                <Text className="text-cream-50 text-[9px] font-bold uppercase">
                  {card.state === 'new'
                    ? 'YENİ'
                    : card.state === 'learning'
                      ? 'ÖĞRENİYORUM'
                      : card.state === 'relearning'
                        ? 'TEKRAR'
                        : 'TEKRAR'}
                </Text>
              </View>
              <Text className="text-[10px] text-slate-500 font-mono">{card.reps} tekrar</Text>
              {card.lapses > 0 && (
                <Text className="text-[10px] text-red-500 font-mono">{card.lapses} unutma</Text>
              )}
            </View>

            {/* Word */}
            <Text className="font-serif text-5xl text-ink-900">{v.word}</Text>
            {v.ipa && <Text className="text-base text-slate-500 font-mono mt-2">[{v.ipa}]</Text>}

            {/* TTS */}
            <View className="mt-4 self-start">
              <KaraokeTTSPlayer text={v.word} language={v.language} compact />
            </View>

            {/* Source sentence */}
            {v.source_sentence && (
              <View className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Text className="text-[9px] font-mono text-amber-700 tracking-widest uppercase mb-1">
                  Bağlam
                </Text>
                <Text className="text-sm text-ink-900 italic leading-5">"{v.source_sentence}"</Text>
              </View>
            )}
          </View>

          {/* Reveal area */}
          {!revealed ? (
            <Pressable
              onPress={() => setRevealed(true)}
              className="bg-ink-900 rounded-2xl py-4 mt-6 items-center"
            >
              <Text className="text-cream-50 font-semibold">Anlamı Göster</Text>
              <Text className="text-amber-500 text-[10px] mt-0.5">Boşluk: tap to reveal</Text>
            </Pressable>
          ) : (
            <View className="mt-6">
              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                Anlam
              </Text>
              <Text className="font-serif text-2xl text-amber-700">{trans}</Text>

              {v.definitions && v.definitions.length > 0 && (
                <View className="mt-3">
                  {v.definitions.slice(0, 1).map((d, i) => (
                    <Text key={i} className="text-xs text-slate-600 leading-5">
                      <Text className="font-bold uppercase text-[10px]">{d.partOfSpeech}</Text>
                      {' · '}
                      {d.definition}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Rating buttons */}
        {revealed && (
          <View className="mt-4">
            <View className="flex-row gap-2">
              {[
                { rating: 1, label: 'Tekrar', color: '#EF4444', emoji: '❌' },
                { rating: 2, label: 'Zor', color: '#F59E0B', emoji: '😓' },
                { rating: 3, label: 'İyi', color: '#10B981', emoji: '✅' },
                { rating: 4, label: 'Kolay', color: '#3B82F6', emoji: '⭐' },
              ].map((btn) => (
                <Pressable
                  key={btn.rating}
                  onPress={() => handleRate(btn.rating as 1 | 2 | 3 | 4)}
                  disabled={rate.isPending}
                  className="flex-1 rounded-2xl py-3 items-center"
                  style={{ backgroundColor: btn.color }}
                >
                  <Text className="text-lg">{btn.emoji}</Text>
                  <Text className="text-white text-[11px] font-bold mt-0.5">{btn.label}</Text>
                  {preview?.intervals?.[btn.rating] && (
                    <Text className="text-white text-[9px] opacity-80 font-mono">
                      {preview.intervals[btn.rating]}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            <Text className="text-[10px] text-slate-400 text-center mt-2">
              Sonraki tekrar süresi
            </Text>
          </View>
        )}

        {/* Session stats */}
        <View className="flex-row gap-3 mt-3 mb-2">
          <Text className="text-[10px] text-slate-500 font-mono">
            ✓ {stats.good}/{stats.done}
          </Text>
          {stats.again > 0 && (
            <Text className="text-[10px] text-red-500 font-mono">❌ {stats.again}</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}
