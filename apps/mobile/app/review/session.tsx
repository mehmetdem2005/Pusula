import { type FlashcardChoice, previewIntervals } from '@kavra/engine'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type DueFlashcard, useDueFlashcards, useGradeFlashcard } from '../../src/hooks/useReview'

export default function ReviewSession() {
  const router = useRouter()
  const { data: cards, isLoading } = useDueFlashcards()
  const grade = useGradeFlashcard()

  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [completed, setCompleted] = useState(0)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [index])

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  if (!cards || cards.length === 0 || index >= cards.length) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50">
        <Stack.Screen options={{ title: 'Tekrar Bitti' }} />
        <View className="flex-1 items-center justify-center p-8">
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text className="text-2xl font-serif text-brand-950 mt-4 text-center">
            Tekrar tamamlandı
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            {completed} kart çalışıldı. Beynin teşekkür ediyor.
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

  const current = cards[index]!
  const intervals = previewIntervals({
    easeFactor: Number(current.ease_factor),
    intervalDays: current.interval_days,
    repetitions: current.repetitions,
  })

  const handleGrade = (choice: FlashcardChoice) => {
    const timeSpent = Date.now() - startTimeRef.current
    grade.mutate(
      { flashcardId: current.id, choice, timeSpentMs: timeSpent },
      {
        onSuccess: () => {
          setShowBack(false)
          setCompleted(completed + 1)
          setIndex(index + 1)
        },
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: `${index + 1} / ${cards.length}`,
          headerStyle: { backgroundColor: '#FAFAFA' },
        }}
      />

      <View className="flex-1 px-5 py-4">
        {/* Progress bar */}
        <View className="h-1 bg-slate-200 rounded-full mb-6 overflow-hidden">
          <View
            className="h-1 bg-brand-950 rounded-full"
            style={{ width: `${((index + 1) / cards.length) * 100}%` }}
          />
        </View>

        {/* Kart */}
        <Pressable
          onPress={() => setShowBack(!showBack)}
          className="flex-1 bg-white rounded-3xl p-6 border border-slate-100 items-center justify-center active:opacity-90"
        >
          {!showBack ? (
            <>
              <View className="flex-row items-center gap-2 mb-4">
                <Text className="text-xs font-semibold text-slate-400 uppercase">SORU</Text>
                {current.is_new && (
                  <View className="bg-accent-500/15 px-2 py-0.5 rounded-full">
                    <Text className="text-accent-700 text-xs font-semibold">YENİ</Text>
                  </View>
                )}
              </View>
              <Text className="text-brand-950 text-2xl font-serif text-center leading-9">
                {current.front}
              </Text>
              {current.hint && (
                <View className="absolute bottom-6">
                  <Text className="text-slate-400 text-xs">💡 {current.hint}</Text>
                </View>
              )}
              <View className="absolute bottom-2">
                <Text className="text-slate-400 text-xs">Cevabı görmek için dokun</Text>
              </View>
            </>
          ) : (
            <>
              <Text className="text-xs font-semibold text-accent-600 uppercase mb-4">CEVAP</Text>
              <Text className="text-brand-950 text-xl text-center leading-7">{current.back}</Text>
              {current.lapses > 0 && (
                <Text className="text-amber-600 text-xs mt-4">
                  ⚠️ Bu kartı {current.lapses} kez unutmuşsun
                </Text>
              )}
            </>
          )}
        </Pressable>

        {/* SM-2 4 buton — sadece arka göründüğünde */}
        {showBack && (
          <View className="mt-4">
            <View className="flex-row gap-2">
              <GradeButton
                label="Tekrar"
                interval={intervals.again}
                color="bg-red-500"
                onPress={() => handleGrade('again')}
                disabled={grade.isPending}
              />
              <GradeButton
                label="Zor"
                interval={intervals.hard}
                color="bg-amber-500"
                onPress={() => handleGrade('hard')}
                disabled={grade.isPending}
              />
              <GradeButton
                label="İyi"
                interval={intervals.good}
                color="bg-green-600"
                onPress={() => handleGrade('good')}
                disabled={grade.isPending}
              />
              <GradeButton
                label="Kolay"
                interval={intervals.easy}
                color="bg-blue-600"
                onPress={() => handleGrade('easy')}
                disabled={grade.isPending}
              />
            </View>
            <Text className="text-center text-slate-400 text-xs mt-3">Sonraki tekrar</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

function GradeButton({
  label,
  interval,
  color,
  onPress,
  disabled,
}: {
  label: string
  interval: string
  color: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 ${color} rounded-2xl py-4 items-center active:opacity-80`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text className="text-white font-bold text-base">{label}</Text>
      <Text className="text-white/80 text-xs mt-0.5">{interval}</Text>
    </Pressable>
  )
}
