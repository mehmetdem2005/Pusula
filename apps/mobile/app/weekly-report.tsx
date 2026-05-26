import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../src/components/ui/Button'
import { useGenerateWeeklyReport, useWeeklyReports } from '../src/hooks/useReflections'

export default function WeeklyReport() {
  const { data: reports, isLoading } = useWeeklyReports()
  const generate = useGenerateWeeklyReport()

  const latest = reports?.[0]

  // Otomatik üret eğer hiç rapor yoksa
  useEffect(() => {
    if (!isLoading && (!reports || reports.length === 0)) {
      generate.mutate(undefined)
    }
  }, [isLoading, reports])

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Haftalık Rapor',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        {(isLoading || generate.isPending) && (
          <View className="py-12 items-center">
            <ActivityIndicator color="#1E1B4B" size="large" />
            <Text className="text-slate-500 text-sm mt-3">
              {generate.isPending ? 'AI raporun hazırlanıyor...' : 'Yükleniyor'}
            </Text>
          </View>
        )}

        {latest && !generate.isPending && (
          <>
            {/* Hafta başlığı */}
            <View className="bg-brand-950 rounded-2xl p-5 mb-4">
              <Text className="text-white/70 text-sm">
                {new Date(latest.week_start).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                })}
                {' — '}
                {new Date(latest.week_end).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>

              <View className="flex-row gap-4 mt-4">
                <Stat label="Ders" value={String(latest.total_lessons)} />
                <Stat label="Tekrar" value={String(latest.total_reviews)} />
                <Stat label="Quiz" value={String(latest.total_quiz_attempts)} />
                <Stat label="Saat" value={`${Math.round(latest.total_minutes / 60)}`} />
              </View>

              {latest.quiz_accuracy !== null && (
                <View className="mt-3 pt-3 border-t border-white/10">
                  <Text className="text-white/70 text-xs">Quiz isabet</Text>
                  <Text className="text-white text-2xl font-bold">
                    %{Math.round(latest.quiz_accuracy * 100)}
                  </Text>
                </View>
              )}
            </View>

            {/* Highlights */}
            {latest.highlights && (
              <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-100">
                <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">
                  Bu hafta öne çıkanlar
                </Text>
                {latest.highlights.most_active_subject && (
                  <Text className="text-brand-950 text-sm mb-1">
                    🎯 En aktif konu:{' '}
                    <Text className="font-semibold">{latest.highlights.most_active_subject}</Text>
                  </Text>
                )}
                {latest.highlights.best_day && (
                  <Text className="text-brand-950 text-sm">
                    📅 En verimli gün:{' '}
                    <Text className="font-semibold">
                      {new Date(latest.highlights.best_day).toLocaleDateString('tr-TR', {
                        weekday: 'long',
                      })}
                    </Text>
                  </Text>
                )}
              </View>
            )}

            {/* AI Narrative */}
            {latest.ai_narrative && (
              <View className="bg-white rounded-2xl p-5 mb-4 border border-slate-100">
                <Text className="text-xs font-semibold text-brand-700 uppercase mb-3">
                  💭 Kavra'dan
                </Text>
                <Text className="text-brand-950 leading-7" selectable>
                  {latest.ai_narrative}
                </Text>
              </View>
            )}

            {/* Recommendations */}
            {latest.ai_recommendations && latest.ai_recommendations.length > 0 && (
              <View className="bg-accent-500/10 rounded-2xl p-4 mb-4 border border-accent-500/30">
                <Text className="text-xs font-semibold text-accent-700 uppercase mb-3">
                  ⭐ Önerilerim
                </Text>
                <View className="gap-2">
                  {latest.ai_recommendations.map((rec, i) => (
                    <View key={i} className="flex-row gap-2">
                      <Text className="text-accent-700 font-bold">{i + 1}.</Text>
                      <Text className="flex-1 text-brand-950 leading-6">{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Yeniden üret */}
            <View className="my-4">
              <Button
                title="Raporu Yenile"
                variant="secondary"
                onPress={() =>
                  generate.mutate(undefined, {
                    onError: (e: any) => Alert.alert('Hata', e.message),
                  })
                }
                fullWidth
              />
            </View>

            {/* Geçmiş raporlar */}
            {reports && reports.length > 1 && (
              <View className="mt-4 mb-8">
                <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">
                  Geçmiş raporlar
                </Text>
                {reports.slice(1).map((r) => (
                  <View key={r.id} className="bg-white border border-slate-100 rounded-xl p-3 mb-2">
                    <Text className="text-brand-950 font-medium">
                      {new Date(r.week_start).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    <Text className="text-slate-500 text-xs">
                      {r.total_lessons} ders · {r.total_reviews} tekrar
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-white text-2xl font-bold">{value}</Text>
      <Text className="text-white/60 text-xs">{label}</Text>
    </View>
  )
}
