import { Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../src/components/ui/Button'
import { Input } from '../src/components/ui/Input'
import { type Goal, useCompleteGoal, useCreateGoal, useGoals } from '../src/hooks/useMotivation'

export default function Goals() {
  const { data: goals, isLoading } = useGoals()
  const [createOpen, setCreateOpen] = useState(false)

  const active = goals?.filter((g) => !g.completed) ?? []
  const completed = goals?.filter((g) => g.completed) ?? []

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Hedeflerim',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
          <Text className="text-brand-900 font-semibold mb-1">🎯 WOOP Yöntemi</Text>
          <Text className="text-brand-800 text-sm leading-5">
            Wish, Outcome, Obstacle, Plan — Gabriele Oettingen'in zihinsel kontrast tekniği. Sadece
            istemek değil, engeli de planlamak.
          </Text>
        </View>

        <Button title="+ Yeni Hedef" onPress={() => setCreateOpen(true)} fullWidth />

        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {active.length > 0 && (
              <View className="mt-6">
                <Text className="text-xs font-semibold text-slate-400 uppercase mb-2 px-1">
                  Aktif ({active.length})
                </Text>
                <View className="gap-3">
                  {active.map((g) => (
                    <GoalCard key={g.id} goal={g} />
                  ))}
                </View>
              </View>
            )}

            {completed.length > 0 && (
              <View className="mt-6 mb-8">
                <Text className="text-xs font-semibold text-slate-400 uppercase mb-2 px-1">
                  Tamamlanan ({completed.length})
                </Text>
                <View className="gap-2">
                  {completed.map((g) => (
                    <View
                      key={g.id}
                      className="bg-white rounded-xl p-3 border border-slate-100 opacity-60"
                    >
                      <Text className="text-brand-950 line-through text-sm" numberOfLines={1}>
                        {g.wish}
                      </Text>
                      <Text className="text-green-600 text-xs mt-0.5">
                        ✓ {new Date(g.completed_at!).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <CreateGoalModal visible={createOpen} onClose={() => setCreateOpen(false)} />
    </SafeAreaView>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const [expanded, setExpanded] = useState(false)
  const complete = useCompleteGoal()

  const daysToTarget = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleComplete = () => {
    Alert.alert('Tebrikler!', `"${goal.wish}" hedefini tamamladın mı?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Evet 🎉', onPress: () => complete.mutate(goal.id) },
    ])
  }

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      className="bg-white rounded-2xl p-4 border border-slate-100 active:opacity-80"
    >
      <View className="flex-row items-start gap-3">
        <Text style={{ fontSize: 24 }}>{goal.subjects?.icon ?? '🎯'}</Text>
        <View className="flex-1">
          <Text className="font-semibold text-brand-950">{goal.wish}</Text>
          <Text className="text-slate-500 text-sm mt-0.5" numberOfLines={expanded ? undefined : 1}>
            → {goal.outcome}
          </Text>
          {daysToTarget !== null && daysToTarget >= 0 && (
            <Text
              className={`text-xs mt-1 font-medium ${
                daysToTarget <= 7
                  ? 'text-red-600'
                  : daysToTarget <= 30
                    ? 'text-amber-600'
                    : 'text-slate-500'
              }`}
            >
              📅 {daysToTarget} gün kaldı
            </Text>
          )}
        </View>
        <Text className="text-slate-400 text-xl">{expanded ? '▾' : '▸'}</Text>
      </View>

      {expanded && (
        <View className="mt-3 pt-3 border-t border-slate-100">
          {goal.obstacle && (
            <View className="mb-3">
              <Text className="text-xs font-semibold text-amber-600 uppercase mb-1">⚠️ Engel</Text>
              <Text className="text-slate-700 text-sm leading-5">{goal.obstacle}</Text>
            </View>
          )}
          {goal.plan && (
            <View className="mb-3">
              <Text className="text-xs font-semibold text-brand-700 uppercase mb-1">📋 Plan</Text>
              <Text className="text-slate-700 text-sm leading-5">{goal.plan}</Text>
            </View>
          )}
          <Pressable
            onPress={handleComplete}
            disabled={complete.isPending}
            className="bg-green-600 py-2 rounded-lg items-center mt-2"
          >
            <Text className="text-white text-sm font-semibold">✓ Tamamlandı İşaretle</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  )
}

function CreateGoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [wish, setWish] = useState('')
  const [outcome, setOutcome] = useState('')
  const [obstacle, setObstacle] = useState('')
  const [plan, setPlan] = useState('')
  const create = useCreateGoal()

  const reset = () => {
    setWish('')
    setOutcome('')
    setObstacle('')
    setPlan('')
  }

  const handleSave = () => {
    if (!wish.trim() || !outcome.trim()) {
      Alert.alert('', 'Wish ve Outcome zorunlu')
      return
    }
    create.mutate(
      {
        wish: wish.trim(),
        outcome: outcome.trim(),
        obstacle: obstacle.trim() || undefined,
        plan: plan.trim() || undefined,
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pt-4 max-h-[90%]">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
          <Text className="text-2xl font-serif text-brand-950 mb-1">Yeni Hedef (WOOP)</Text>
          <Text className="text-slate-500 text-sm mb-4">
            4 adımı tek tek doldur. Engeli ve planı düşünmek başarı şansını 2x artırır.
          </Text>

          <ScrollView style={{ maxHeight: 400 }}>
            <Input
              label="W — Wish (Dilek)"
              value={wish}
              onChangeText={setWish}
              placeholder="Almanca B1 sınavını geçmek"
            />
            <Input
              label="O — Outcome (Sonuç)"
              value={outcome}
              onChangeText={setOutcome}
              placeholder="Erasmus için Berlin'e gitmek"
            />
            <Input
              label="O — Obstacle (Engel)"
              value={obstacle}
              onChangeText={setObstacle}
              placeholder="Düzenli çalışmamak, ezber sıkıcı"
            />
            <Input
              label="P — Plan (Eğer-O zaman)"
              value={plan}
              onChangeText={setPlan}
              placeholder="Hafta içi 21:00'da olduğumda Anki açacağım"
            />
          </ScrollView>

          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <Button
                title="İptal"
                variant="secondary"
                onPress={onClose}
                disabled={create.isPending}
              />
            </View>
            <View className="flex-1">
              <Button title="Kaydet" onPress={handleSave} loading={create.isPending} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
