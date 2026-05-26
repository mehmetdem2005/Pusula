import { useQuery } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../src/components/ui/Icon'
import { apiFetch } from '../src/lib/api'

export default function LeaderboardScreen() {
  const router = useRouter()
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => apiFetch<{ entries: any[]; myRank: any }>(`/api/leaderboard?period=${period}`),
  })

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="mb-2">
          <Icon name="chevron-left" size={20} color="#1E1B4B" />
        </Pressable>
        <Text className="font-serif text-3xl text-ink-900">Liderlik</Text>
        <Text className="text-sm text-slate-600 mt-1">
          Sadece public profilli kullanıcılar listede görünür.
        </Text>
      </View>

      {/* Period toggle */}
      <View className="flex-row px-5 mt-3 gap-2">
        {(['weekly', 'monthly'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-full ${period === p ? 'bg-ink-900' : 'bg-white border border-slate-200'}`}
          >
            <Text
              className={`text-center text-xs font-bold ${period === p ? 'text-cream-50' : 'text-slate-600'}`}
            >
              {p === 'weekly' ? 'Bu Hafta' : 'Bu Ay'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* My rank banner */}
      {data?.myRank && (
        <View className="mx-5 mt-3 bg-amber-500 rounded-2xl p-3 flex-row items-center gap-3">
          <View className="w-10 h-10 bg-ink-900 rounded-full items-center justify-center">
            <Text className="text-cream-50 font-bold text-sm">#{data.myRank.rank}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-ink-900 font-bold">Senin Yerin</Text>
            <Text className="text-[10px] text-ink-900/70">
              {data.myRank.review_count} tekrar · {data.myRank.active_days} aktif gün
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F59E0B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {(data?.entries ?? []).map((e: any) => (
            <Pressable
              key={e.user_id}
              onPress={() => e.username && router.push(`/u/${e.username}`)}
              className="bg-white border border-slate-100 rounded-2xl p-3 mb-2 flex-row items-center gap-3"
            >
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  e.rank === 1
                    ? 'bg-amber-500'
                    : e.rank === 2
                      ? 'bg-slate-300'
                      : e.rank === 3
                        ? 'bg-orange-300'
                        : 'bg-cream-50 border border-slate-100'
                }`}
              >
                <Text
                  className={`font-bold text-sm ${e.rank <= 3 ? 'text-ink-900' : 'text-slate-600'}`}
                >
                  {e.rank}
                </Text>
              </View>

              <View className="w-9 h-9 rounded-full bg-ink-900 items-center justify-center">
                <Text className="text-amber-500 text-[11px] font-bold">
                  {(e.full_name ?? e.username ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-sm text-ink-900 font-semibold">
                  @{e.username ?? 'anonim'}
                </Text>
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  {e.review_count} tekrar · {e.active_days} aktif gün
                </Text>
              </View>

              <View className="items-end">
                <Text className="font-mono text-base text-amber-600 font-bold">
                  {Math.round(e.score)}
                </Text>
                <Text className="text-[9px] text-slate-500">puan</Text>
              </View>
            </Pressable>
          ))}

          {(data?.entries ?? []).length === 0 && (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">📊</Text>
              <Text className="font-serif text-lg text-slate-700">Liderlik henüz boş</Text>
              <Text className="text-sm text-slate-500 mt-1 text-center">
                İlk listeye girmek için profilini public yap ve tekrar yapmaya başla.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
