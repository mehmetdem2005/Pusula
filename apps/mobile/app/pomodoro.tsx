import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, Animated, Easing, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCompleteFocus, useStartFocus, useTodayFocus } from '../src/hooks/useMotivation'
import { type PomodoroPhase, formatSeconds, usePomodoro } from '../src/hooks/usePomodoro'

const PHASE_META: Record<PomodoroPhase, { color: string; label: string; emoji: string }> = {
  idle: { color: '#1E1B4B', label: 'Hazır', emoji: '🧘' },
  focus: { color: '#DC2626', label: 'Odak', emoji: '🍅' },
  short_break: { color: '#059669', label: 'Kısa Mola', emoji: '☕' },
  long_break: { color: '#0891B2', label: 'Uzun Mola', emoji: '🌊' },
}

export default function Pomodoro() {
  const router = useRouter()
  const { data: today } = useTodayFocus()
  const startFocus = useStartFocus()
  const completeFocus = useCompleteFocus()
  const focusIdRef = useRef<string | null>(null)
  const focusStartedAtRef = useRef<number>(0)

  const pulse = useRef(new Animated.Value(1)).current

  const pomo = usePomodoro({
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    onPhaseEnd: (prev, next) => {
      // Focus bittiğinde DB'ye yaz
      if (prev === 'focus' && focusIdRef.current) {
        const actualMinutes = Math.round((Date.now() - focusStartedAtRef.current) / 60000)
        completeFocus.mutate({
          focusId: focusIdRef.current,
          actualMinutes,
          completed: true,
        })
        focusIdRef.current = null
      }

      // Yeni focus phase başlıyorsa DB'de session oluştur
      if (next === 'focus') {
        startFocus.mutate(
          { type: 'pomodoro', plannedMinutes: 25 },
          {
            onSuccess: (r) => {
              focusIdRef.current = r.focusId
              focusStartedAtRef.current = Date.now()
            },
          },
        )
      }

      Alert.alert(
        next === 'focus'
          ? '🍅 Odak vakti'
          : next === 'long_break'
            ? '🌊 Uzun mola'
            : '☕ Kısa mola',
        next === 'focus'
          ? '25 dakika derin çalışma başlasın'
          : next === 'long_break'
            ? '15 dakika tamamen dinlen — ekrandan uzaklaş'
            : '5 dakika ayağa kalk, su iç',
      )
    },
  })

  // Pulse animasyon — running iken
  useEffect(() => {
    if (pomo.isRunning && pomo.phase !== 'idle') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      )
      anim.start()
      return () => anim.stop()
    }
    pulse.setValue(1)
    return
  }, [pomo.isRunning, pomo.phase, pulse])

  const handleStart = () => {
    pomo.start()
    if (pomo.phase === 'idle') {
      // İlk start, focus session oluştur
      startFocus.mutate(
        { type: 'pomodoro', plannedMinutes: 25 },
        {
          onSuccess: (r) => {
            focusIdRef.current = r.focusId
            focusStartedAtRef.current = Date.now()
          },
        },
      )
    }
  }

  const handleReset = () => {
    Alert.alert('Sıfırla', "Pomodoro'yu sıfırlamak istiyor musun?", [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sıfırla',
        style: 'destructive',
        onPress: () => {
          if (focusIdRef.current) {
            const actualMinutes = Math.round((Date.now() - focusStartedAtRef.current) / 60000)
            completeFocus.mutate({
              focusId: focusIdRef.current,
              actualMinutes,
              completed: false,
            })
            focusIdRef.current = null
          }
          pomo.reset()
        },
      },
    ])
  }

  const meta = PHASE_META[pomo.phase]

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: meta.color }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Üst: Close + bugün stats */}
      <View className="flex-row justify-between items-center px-5 pt-4">
        <Pressable onPress={() => router.back()} className="p-2">
          <Text className="text-white text-2xl">✕</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-white/60 text-xs">BUGÜN</Text>
          <Text className="text-white font-bold text-lg">
            {today?.totalMinutes ?? 0} dk · {today?.sessions.filter((s) => s.completed).length ?? 0}{' '}
            🍅
          </Text>
        </View>
        <View className="w-10" />
      </View>

      {/* Orta: Timer */}
      <View className="flex-1 items-center justify-center">
        <Animated.View
          className="w-64 h-64 rounded-full bg-white/10 items-center justify-center"
          style={{ transform: [{ scale: pulse }] }}
        >
          <View className="w-56 h-56 rounded-full bg-white/15 items-center justify-center">
            <Text style={{ fontSize: 48 }}>{meta.emoji}</Text>
            <Text className="text-white text-6xl font-bold mt-2 tabular-nums">
              {formatSeconds(pomo.secondsLeft)}
            </Text>
            <Text className="text-white/70 text-sm uppercase tracking-wider mt-1">
              {meta.label}
            </Text>
          </View>
        </Animated.View>

        {/* Cycle göstergesi */}
        {pomo.phase !== 'idle' && (
          <View className="flex-row gap-2 mt-8">
            {[1, 2, 3, 4].map((n) => (
              <View
                key={n}
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    n <= pomo.completedCycles % 4 ? 'white' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Alt: kontroller */}
      <View className="pb-10 px-8">
        {pomo.phase === 'idle' ? (
          <Pressable onPress={handleStart} className="bg-white py-4 rounded-2xl items-center">
            <Text className="font-bold text-lg" style={{ color: meta.color }}>
              🍅 İlk Pomodoro'yu Başlat
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleReset}
              className="px-6 py-4 bg-white/15 rounded-2xl items-center"
            >
              <Text className="text-white font-semibold">Sıfırla</Text>
            </Pressable>
            <Pressable
              onPress={pomo.isRunning ? pomo.pause : pomo.start}
              className="flex-1 bg-white py-4 rounded-2xl items-center"
            >
              <Text className="font-bold text-lg" style={{ color: meta.color }}>
                {pomo.isRunning ? '⏸ Duraklat' : '▶ Devam'}
              </Text>
            </Pressable>
            <Pressable
              onPress={pomo.skip}
              className="px-6 py-4 bg-white/15 rounded-2xl items-center"
            >
              <Text className="text-white font-semibold">Atla</Text>
            </Pressable>
          </View>
        )}

        <Text className="text-white/60 text-center text-xs mt-4">
          25dk odak · 5dk mola · her 4 cycle'da uzun mola
        </Text>
      </View>
    </SafeAreaView>
  )
}
