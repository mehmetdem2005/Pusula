import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { type Subject, useCreateSubject, useSubjects } from '../../src/hooks/useSubjects'

const ICONS = ['📘', '📗', '📙', '📕', '🧮', '🧬', '⚗️', '🌍', '💻', '🎨', '🎵', '📐']
const COLORS = [
  '#1E1B4B',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#65A30D',
  '#059669',
  '#0891B2',
]

export default function LearnTab() {
  const router = useRouter()
  const { data: subjects, isLoading } = useSubjects()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-3xl font-serif text-brand-950">Konularım</Text>
        <Text className="text-slate-500 mt-1 mb-6">
          Ders, sınav ya da merak ettiğin bir alan — konu olarak ekle.
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" style={{ marginVertical: 40 }} />
        ) : !subjects || subjects.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
            <Text style={{ fontSize: 48 }}>🌱</Text>
            <Text className="text-lg font-semibold text-brand-950 mt-3">Henüz konu yok</Text>
            <Text className="text-slate-500 text-center mt-1 mb-4">
              İlk konunu oluştur, kavramlarını ekle, Kavra sana uyarlansın.
            </Text>
            <Button title="+ İlk Konu" onPress={() => setCreateOpen(true)} fullWidth />
          </View>
        ) : (
          <>
            <View className="gap-3">
              {subjects.map((s) => (
                <SubjectCard
                  key={s.id}
                  subject={s}
                  onPress={() => router.push(`/subject/${s.id}`)}
                />
              ))}
            </View>
            <View className="mt-4 mb-8">
              <Button
                title="+ Yeni Konu"
                onPress={() => setCreateOpen(true)}
                variant="secondary"
                fullWidth
              />
            </View>
          </>
        )}
      </ScrollView>

      <CreateSubjectModal visible={createOpen} onClose={() => setCreateOpen(false)} />
    </SafeAreaView>
  )
}

function SubjectCard({ subject, onPress }: { subject: Subject; onPress: () => void }) {
  const daysToExam = subject.exam_date
    ? Math.ceil((new Date(subject.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center gap-4 active:opacity-70"
    >
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center"
        style={{ backgroundColor: `${subject.color}20` }}
      >
        <Text style={{ fontSize: 28 }}>{subject.icon ?? '📘'}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-brand-950 text-base" numberOfLines={1}>
          {subject.name}
        </Text>
        {subject.description && (
          <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
            {subject.description}
          </Text>
        )}
        {daysToExam !== null && daysToExam >= 0 && (
          <View className="flex-row items-center gap-1 mt-1">
            <Text
              className={`text-xs font-semibold ${
                daysToExam <= 7
                  ? 'text-red-600'
                  : daysToExam <= 30
                    ? 'text-amber-600'
                    : 'text-slate-500'
              }`}
            >
              📅 Sınav: {daysToExam} gün
            </Text>
          </View>
        )}
      </View>
      <Text className="text-slate-400 text-xl">›</Text>
    </Pressable>
  )
}

function CreateSubjectModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(ICONS[0]!)
  const [color, setColor] = useState(COLORS[0]!)
  const create = useCreateSubject()

  const reset = () => {
    setName('')
    setDescription('')
    setIcon(ICONS[0]!)
    setColor(COLORS[0]!)
  }

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('', 'Konu ismi boş olamaz')
      return
    }
    create.mutate(
      { name: name.trim(), description: description.trim() || undefined, icon, color },
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
        <View className="bg-white rounded-t-3xl p-6 pt-4">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
          <Text className="text-2xl font-serif text-brand-950 mb-4">Yeni Konu</Text>

          <Input
            label="İsim"
            value={name}
            onChangeText={setName}
            placeholder="Örn: Kimya, YDS, Almanca A2"
          />
          <Input
            label="Açıklama (ops.)"
            value={description}
            onChangeText={setDescription}
            placeholder="Kısa not"
          />

          <Text className="text-xs font-semibold text-slate-400 uppercase mt-2 mb-2">İkon</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {ICONS.map((i) => (
              <Pressable
                key={i}
                onPress={() => setIcon(i)}
                className={[
                  'w-12 h-12 rounded-xl items-center justify-center border-2',
                  icon === i ? 'border-brand-950 bg-brand-50' : 'border-slate-100 bg-white',
                ].join(' ')}
              >
                <Text style={{ fontSize: 24 }}>{i}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">Renk</Text>
          <View className="flex-row gap-2 mb-4">
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: '#FFFFFF',
                  shadowColor: color === c ? c : 'transparent',
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                }}
              >
                {color === c && <Text className="text-white font-bold">✓</Text>}
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-3 mt-2">
            <View className="flex-1">
              <Button
                title="İptal"
                variant="secondary"
                onPress={onClose}
                disabled={create.isPending}
              />
            </View>
            <View className="flex-1">
              <Button title="Oluştur" onPress={handleCreate} loading={create.isPending} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
