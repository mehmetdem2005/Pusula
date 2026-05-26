import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { useStreak } from '../../src/hooks/useMotivation'
import {
  useReflections,
  useTodayReflection,
  useUpsertReflection,
} from '../../src/hooks/useReflections'

const MOOD_LABELS = ['', 'Zor', 'Eh', 'İyi', 'Çok iyi', 'Harika']
const MOOD_EMOJIS = ['', '😞', '😐', '🙂', '😊', '🤩']
const ENERGY_EMOJIS = ['', '🪫', '🔋', '🔋🔋', '⚡', '⚡⚡']

export default function JournalTab() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayRef, isLoading } = useTodayReflection()
  const { data: recent } = useReflections(7)
  const { data: streak } = useStreak()
  const upsert = useUpsertReflection()

  const [mood, setMood] = useState<number>(0)
  const [energy, setEnergy] = useState<number>(0)
  const [whatLearned, setWhatLearned] = useState('')
  const [whatStruggled, setWhatStruggled] = useState('')
  const [tomorrowFocus, setTomorrowFocus] = useState('')
  const [draft, setDraft] = useState(false)

  // Mevcut bugünkü reflection varsa form'u doldur
  useEffect(() => {
    if (todayRef) {
      setMood(todayRef.mood ?? 0)
      setEnergy(todayRef.energy ?? 0)
      setWhatLearned(todayRef.what_learned ?? '')
      setWhatStruggled(todayRef.what_struggled ?? '')
      setTomorrowFocus(todayRef.tomorrow_focus ?? '')
    }
  }, [todayRef])

  const save = () => {
    upsert.mutate(
      {
        date: today,
        mood: mood || undefined,
        energy: energy || undefined,
        what_learned: whatLearned.trim() || undefined,
        what_struggled: whatStruggled.trim() || undefined,
        tomorrow_focus: tomorrowFocus.trim() || undefined,
      },
      {
        onSuccess: () => {
          setDraft(false)
          Alert.alert('✓', 'Yansımanı kaydettim. Bunu sürdürmek seni güçlendirir.')
        },
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="flex-row items-end justify-between mb-1">
          <Text className="text-3xl font-serif text-brand-950">Günlüğüm</Text>
          {(streak?.currentStreak ?? 0) > 0 && (
            <View className="bg-accent-500/15 px-3 py-1 rounded-full flex-row items-center gap-1">
              <Text style={{ fontSize: 14 }}>🔥</Text>
              <Text className="text-accent-700 font-bold text-sm">{streak!.currentStreak} gün</Text>
            </View>
          )}
        </View>
        <Text className="text-slate-500 mb-6">
          {todayRef ? 'Bugünkü yansımanı düzenle' : 'Bugün ne yaşadın?'}
        </Text>

        {/* Mood + Energy */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-3">
          <Text className="text-xs font-semibold text-slate-400 uppercase mb-3">
            Bugün nasıldın?
          </Text>
          <View className="flex-row justify-between gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  setMood(n)
                  setDraft(true)
                }}
                className={[
                  'flex-1 p-2 rounded-xl items-center',
                  mood === n ? 'bg-brand-50 border border-brand-300' : '',
                ].join(' ')}
              >
                <Text style={{ fontSize: 28 }}>{MOOD_EMOJIS[n]}</Text>
                <Text className="text-xs text-slate-500 mt-0.5">{MOOD_LABELS[n]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-3">
          <Text className="text-xs font-semibold text-slate-400 uppercase mb-3">
            Enerji seviyesi
          </Text>
          <View className="flex-row justify-between gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  setEnergy(n)
                  setDraft(true)
                }}
                className={[
                  'flex-1 p-2 rounded-xl items-center',
                  energy === n ? 'bg-brand-50 border border-brand-300' : '',
                ].join(' ')}
              >
                <Text style={{ fontSize: 22 }}>{ENERGY_EMOJIS[n]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Yazılı kısımlar */}
        <ReflectionField
          icon="🧠"
          label="Bugün ne öğrendim?"
          value={whatLearned}
          onChange={(v) => {
            setWhatLearned(v)
            setDraft(true)
          }}
        />
        <ReflectionField
          icon="🪨"
          label="Neyle zorlandım?"
          value={whatStruggled}
          onChange={(v) => {
            setWhatStruggled(v)
            setDraft(true)
          }}
        />
        <ReflectionField
          icon="🎯"
          label="Yarın neye odaklanacağım?"
          value={tomorrowFocus}
          onChange={(v) => {
            setTomorrowFocus(v)
            setDraft(true)
          }}
        />

        {draft && (
          <View className="my-4">
            <Button title="Kaydet" onPress={save} loading={upsert.isPending} fullWidth size="lg" />
          </View>
        )}

        {/* Haftalık rapor link */}
        <Pressable
          onPress={() => router.push('/weekly-report')}
          className="bg-brand-950 rounded-2xl p-4 mt-4 flex-row items-center gap-3 active:opacity-70"
        >
          <Text style={{ fontSize: 28 }}>📊</Text>
          <View className="flex-1">
            <Text className="text-white font-semibold">Haftalık AI Raporun</Text>
            <Text className="text-white/70 text-xs">Kavra'nın haftalık değerlendirmesi</Text>
          </View>
          <Text className="text-white/70 text-xl">›</Text>
        </Pressable>

        {/* Son yansımalar */}
        {recent && recent.length > 1 && (
          <View className="mt-6 mb-8">
            <Text className="text-xs font-semibold text-slate-400 uppercase mb-3">Son 7 gün</Text>
            <View className="gap-2">
              {recent
                .filter((r) => r.date !== today)
                .map((r) => (
                  <View key={r.id} className="bg-white rounded-xl p-3 border border-slate-100">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs text-slate-500">
                        {new Date(r.date).toLocaleDateString('tr-TR', {
                          weekday: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <View className="flex-row gap-1">
                        {r.mood && <Text>{MOOD_EMOJIS[r.mood]}</Text>}
                        {r.energy && <Text>{ENERGY_EMOJIS[r.energy]}</Text>}
                      </View>
                    </View>
                    {r.what_learned && (
                      <Text className="text-brand-950 text-sm mt-1" numberOfLines={2}>
                        {r.what_learned}
                      </Text>
                    )}
                  </View>
                ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ReflectionField({
  icon,
  label,
  value,
  onChange,
}: { icon: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-3">
      <View className="flex-row items-center gap-2 mb-2">
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text className="text-xs font-semibold text-slate-700 uppercase">{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Birkaç cümle yaz..."
        placeholderTextColor="#94A3B8"
        multiline
        className="text-brand-950 leading-6 min-h-[60px]"
      />
    </View>
  )
}
