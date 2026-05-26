import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon, type IconName } from '../src/components/ui/Icon'
import { useVocabStats } from '../src/hooks/useVocabReview'

export default function ExercisesScreen() {
  const router = useRouter()
  const { data: stats, isLoading } = useVocabStats()

  const last7Days = getLast7DaysHeatmap(stats?.heatmap)

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header with weekday strip */}
        <View className="px-5 pt-4">
          <View
            className="bg-ink-950 rounded-3xl p-5 overflow-hidden"
            style={{ position: 'relative' }}
          >
            <View
              style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 150,
                height: 150,
                backgroundColor: '#F59E0B33',
                borderRadius: 75,
              }}
            />
            <Text className="font-mono text-[10px] text-amber-500 tracking-widest uppercase mb-2">
              Bu Hafta
            </Text>
            <Text className="font-serif text-3xl text-cream-50 leading-tight">Egzersizler</Text>

            {/* Weekday strip */}
            <View className="flex-row justify-between mt-5">
              {last7Days.map((day, i) => (
                <View key={i} className="items-center" style={{ flex: 1 }}>
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor:
                        day.count === 0
                          ? 'rgba(255,255,255,0.1)'
                          : day.count < 5
                            ? 'rgba(245,158,11,0.3)'
                            : day.count < 15
                              ? 'rgba(245,158,11,0.6)'
                              : '#F59E0B',
                    }}
                  >
                    {day.count > 0 && (
                      <Text
                        className="text-[10px] font-bold"
                        style={{ color: day.count > 10 ? '#1E1B4B' : '#FBF8F0' }}
                      >
                        {day.count}
                      </Text>
                    )}
                  </View>
                  <Text className="text-[9px] text-slate-400 mt-1.5 font-mono uppercase">
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stats */}
        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" style={{ marginTop: 24 }} />
        ) : stats ? (
          <View className="px-5 mt-4 flex-row gap-2">
            <StatCard label="Bekleyen" value={stats.dueCards} color="#F59E0B" icon="clock" />
            <StatCard label="Toplam" value={stats.totalCards} color="#1E1B4B" icon="layers" />
            <StatCard label="Mastered" value={stats.masteredWords} color="#10B981" icon="trophy" />
          </View>
        ) : null}

        {/* Aralıklı Öğrenme */}
        <View className="px-5 mt-6">
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            Aralıklı Öğrenme · FSRS-5
          </Text>

          <ExerciseCard
            icon="puzzle"
            iconBg="#F59E0B22"
            iconColor="#F59E0B"
            title="Bekleyen Tekrarlar"
            desc={stats?.dueCards ? `${stats.dueCards} kart hazır` : 'Bugün gelen yok'}
            badge={stats?.dueCards ? `${stats.dueCards}` : null}
            badgeColor="#F59E0B"
            disabled={!stats?.dueCards}
            onPress={() => router.push('/exercises/review')}
          />

          <ExerciseCard
            icon="repeat"
            iconBg="#7C3AED22"
            iconColor="#7C3AED"
            title="Karışık Tekrar"
            desc="Yeni + tekrar (Mixed FSRS)"
            onPress={() => router.push('/exercises/mixed')}
          />
        </View>

        {/* Egzersiz Türleri */}
        <View className="px-5 mt-6">
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            Egzersiz Türleri
          </Text>

          <ExerciseCard
            icon="layers"
            iconBg="#1E1B4B22"
            iconColor="#1E1B4B"
            title="Kartlar"
            desc="Klasik flashcard, 4 zorluk butonu"
            onPress={() => router.push('/exercises/flashcard')}
          />

          <ExerciseCard
            icon="check-circle"
            iconBg="#0891B222"
            iconColor="#0891B2"
            title="Çoktan Seçmeli"
            desc="4 seçenek, AI distractor üretir"
            badge="PRO"
            badgeColor="#F59E0B"
            onPress={() => router.push('/exercises/multiple-choice')}
          />

          <ExerciseCard
            icon="shuffle"
            iconBg="#DB277722"
            iconColor="#DB2777"
            title="Kelime Oluştur"
            desc="Karışık harflerden kelimeyi yap"
            onPress={() => router.push('/exercises/word-formation')}
          />

          <ExerciseCard
            icon="edit"
            iconBg="#05966922"
            iconColor="#059669"
            title="Boşluk Doldurma"
            desc="Cümlede eksik kelimeyi yaz"
            onPress={() => router.push('/exercises/cloze')}
          />

          <ExerciseCard
            icon="headphones"
            iconBg="#CA8A0422"
            iconColor="#CA8A04"
            title="Dinleme"
            desc="Duyduğun kelimeyi yaz"
            badge="PRO"
            badgeColor="#F59E0B"
            onPress={() => router.push('/exercises/listening')}
          />
        </View>

        {/* Stats CTA */}
        {stats && stats.totalCards > 0 && (
          <View className="px-5 mt-6">
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center gap-3">
              <Icon name="activity" size={22} color="#F59E0B" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink-900">
                  Tutturma oranı: %{Math.round(stats.retentionRate * 100)}
                </Text>
                <Text className="text-xs text-amber-900 mt-0.5">
                  Son 30 günde {stats.reviewsLast30Days} tekrar yaptın
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: { label: string; value: number; color: string; icon: IconName }) {
  return (
    <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3">
      <View className="flex-row items-center justify-between">
        <Icon name={icon} size={14} color={color} />
        <Text className="font-serif text-2xl" style={{ color, fontStyle: 'italic' }}>
          {value}
        </Text>
      </View>
      <Text className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{label}</Text>
    </View>
  )
}

function ExerciseCard({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  badge,
  badgeColor,
  disabled,
  onPress,
}: {
  icon: IconName
  iconBg: string
  iconColor: string
  title: string
  desc: string
  badge?: string | null
  badgeColor?: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`bg-white border border-slate-100 rounded-2xl p-3.5 mb-2 flex-row items-center gap-3 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <View
        className="w-11 h-11 rounded-xl items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-semibold text-ink-900 text-sm">{title}</Text>
          {badge && (
            <View
              className="rounded px-1.5 py-0.5"
              style={{ backgroundColor: badgeColor ?? '#1E1B4B' }}
            >
              <Text className="text-[9px] text-ink-900 font-bold">{badge}</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-slate-500 mt-0.5">{desc}</Text>
      </View>
      <Icon name="chevron-right" size={16} color="#CBD5E1" />
    </Pressable>
  )
}

function getLast7DaysHeatmap(heatmap?: Record<string, { count: number; correct: number }>) {
  const labels = ['Pa', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']
  const result = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayOfWeek = (d.getDay() + 6) % 7 // Pa=0
    const key = d.toISOString().split('T')[0]
    result.push({
      label: labels[dayOfWeek],
      count: heatmap?.[key]?.count ?? 0,
    })
  }
  return result
}
