import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Animated, Dimensions, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  type GeneratedFlashcard,
  useAcceptFlashcard,
  usePendingFlashcards,
  useRejectFlashcard,
} from '../../../src/hooks/useDocuments'

const { width } = Dimensions.get('window')

export default function FlashcardReview() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: cards, isLoading } = usePendingFlashcards(id ?? null)
  const accept = useAcceptFlashcard()
  const reject = useRejectFlashcard()

  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  const remaining = cards ?? []
  const current = remaining[index]

  const next = () => {
    setShowBack(false)
    if (index >= remaining.length - 1) {
      // Bitti
      router.back()
    } else {
      setIndex(index + 1)
    }
  }

  const handleAccept = () => {
    if (!current) return
    accept.mutate(current.id, { onSuccess: next, onError: next })
  }

  const handleReject = () => {
    if (!current) return
    reject.mutate(current.id, { onSuccess: next, onError: next })
  }

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50">
        <Stack.Screen
          options={{
            title: 'Kart İncelemesi',
            headerStyle: { backgroundColor: '#FAFAFA' },
          }}
        />
        <View className="flex-1 items-center justify-center p-8">
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text className="text-2xl font-serif text-brand-950 mt-4">Hepsini bitirdin</Text>
          <Text className="text-slate-500 text-center mt-2">
            Onayladığın kartlar artık tekrar listende.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 bg-brand-950 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Bitir</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: `${index + 1} / ${remaining.length}`,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B' },
        }}
      />

      <View className="flex-1 px-5 py-4">
        {/* İlerleme çubuğu */}
        <View className="h-1 bg-slate-200 rounded-full mb-6 overflow-hidden">
          <View
            className="h-1 bg-brand-950 rounded-full"
            style={{ width: `${((index + 1) / remaining.length) * 100}%` }}
          />
        </View>

        {/* Kart */}
        <Pressable
          onPress={() => setShowBack(!showBack)}
          className="flex-1 bg-white rounded-3xl p-6 border border-slate-100 items-center justify-center active:opacity-90"
        >
          {!showBack ? (
            <>
              <Text className="text-xs font-semibold text-slate-400 uppercase mb-4">ÖN — soru</Text>
              <Text className="text-brand-950 text-2xl font-serif text-center leading-9">
                {current.front}
              </Text>
              {current.hint && (
                <View className="absolute bottom-6">
                  <Text className="text-slate-400 text-xs">💡 {current.hint}</Text>
                </View>
              )}
              <View className="absolute bottom-2">
                <Text className="text-slate-400 text-xs">Cevap için karta dokun</Text>
              </View>
            </>
          ) : (
            <>
              <Text className="text-xs font-semibold text-accent-600 uppercase mb-4">
                ARKA — cevap
              </Text>
              <Text className="text-brand-950 text-xl text-center leading-7">{current.back}</Text>
              <View className="mt-6 pt-6 border-t border-slate-100 w-full">
                <Text className="text-slate-400 text-xs text-center mb-2">Kart kalitesi</Text>
                <View className="flex-row justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Text key={i} style={{ fontSize: 16 }}>
                      {i < current.difficulty ? '⭐' : '☆'}
                    </Text>
                  ))}
                </View>
              </View>
            </>
          )}
        </Pressable>

        {/* Aksiyon butonları */}
        <View className="flex-row gap-3 mt-6">
          <Pressable
            onPress={handleReject}
            disabled={reject.isPending}
            className="flex-1 h-16 bg-red-50 border border-red-200 rounded-2xl items-center justify-center"
          >
            <Text style={{ fontSize: 28 }}>✗</Text>
            <Text className="text-red-700 text-xs font-semibold">Atla</Text>
          </Pressable>
          <Pressable
            onPress={handleAccept}
            disabled={accept.isPending}
            className="flex-1 h-16 bg-brand-950 rounded-2xl items-center justify-center"
          >
            <Text style={{ fontSize: 28 }}>✓</Text>
            <Text className="text-white text-xs font-semibold">Tut</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}
