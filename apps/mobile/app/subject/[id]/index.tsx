import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'
import {
  type ConceptWithProgress,
  useConcepts,
  useCreateConcept,
} from '../../../src/hooks/useConcepts'
import { useSubjectStats } from '../../../src/hooks/useErrors'
import { useCreateLesson } from '../../../src/hooks/useLessons'
import { useGenerateQuiz } from '../../../src/hooks/useQuiz'
import { useDeleteSubject, useSubject, useUpdateSubject } from '../../../src/hooks/useSubjects'

export default function SubjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: subject, isLoading: sLoading } = useSubject(id ?? null)
  const { data: concepts, isLoading: cLoading } = useConcepts(id ?? null)
  const createConcept = useCreateConcept()
  const updateSubject = useUpdateSubject()
  const deleteSubject = useDeleteSubject()
  const createLesson = useCreateLesson()
  const generateQuizMutation = useGenerateQuiz()
  const { data: stats } = useSubjectStats(id ?? null)

  const [addConceptOpen, setAddConceptOpen] = useState(false)

  const generateQuiz = () => {
    if (!id) return
    if (!concepts || concepts.length === 0) {
      Alert.alert('Konsept ekle', 'Quiz üretmek için bu konuya en az bir konsept eklemelisin.')
      return
    }
    Alert.alert(
      'Quiz Üret',
      `${subject?.name} için 8 soruluk karışık zorlukta quiz üretilecek (~10sn).`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Üret',
          onPress: () => {
            generateQuizMutation.mutate(
              { source: 'subject', sourceId: id, questionCount: 8, difficulty: 'mixed' },
              {
                onSuccess: (r) => router.push(`/quiz/${r.quizId}`),
                onError: (e: any) => Alert.alert('Hata', e.message),
              },
            )
          },
        },
      ],
    )
  }

  if (sLoading || !subject) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  const daysToExam = subject.exam_date
    ? Math.ceil((new Date(subject.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const startLessonOnConcept = (conceptId: string) => {
    createLesson.mutate(
      { subjectId: id, conceptId },
      {
        onSuccess: (l) => router.push(`/lesson/${l.id}`),
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  const handleSetExamDate = () => {
    // Basit prompt: 30/90/180/365 gün seçenekleri
    Alert.alert('Sınav Tarihi', 'Sınav ne zaman?', [
      { text: '7 gün', onPress: () => setExamDays(7) },
      { text: '30 gün', onPress: () => setExamDays(30) },
      { text: '90 gün', onPress: () => setExamDays(90) },
      { text: 'Kaldır', style: 'destructive', onPress: () => setExamDays(null) },
      { text: 'İptal', style: 'cancel' },
    ])
  }

  const setExamDays = (days: number | null) => {
    if (!id) return
    const examDate = days
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null
    updateSubject.mutate({ id, exam_date: examDate })
  }

  const handleDelete = () => {
    Alert.alert('Konuyu Sil', `"${subject.name}" konusunu silmek istiyor musun?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => deleteSubject.mutate(id!, { onSuccess: () => router.back() }),
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: subject.name,
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
          headerRight: () => (
            <Pressable onPress={() => router.push(`/subject/${id}/map`)} className="px-2">
              <Text style={{ fontSize: 20 }}>🗺️</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Konu başlığı */}
        <View
          className="rounded-3xl p-5 mb-4"
          style={{
            backgroundColor: `${subject.color}15`,
            borderWidth: 1,
            borderColor: `${subject.color}40`,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: subject.color }}
            >
              <Text style={{ fontSize: 32 }}>{subject.icon ?? '📘'}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-brand-950">{subject.name}</Text>
              {subject.description && (
                <Text className="text-slate-600 text-sm mt-0.5">{subject.description}</Text>
              )}
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row gap-4 mt-4">
            <Stat label="Kavram" value={String(stats?.total_concepts ?? concepts?.length ?? 0)} />
            <Stat
              label="Mastered"
              value={`${stats?.mastered_concepts ?? 0}/${stats?.total_concepts ?? 0}`}
            />
            <Stat
              label="Tekrar"
              value={String(stats?.due_flashcards ?? 0)}
              highlight={(stats?.due_flashcards ?? 0) > 0}
            />
            {daysToExam !== null && daysToExam >= 0 && (
              <Stat label="Sınav" value={`${daysToExam}g`} highlight={daysToExam <= 14} />
            )}
          </View>

          {/* Hata göstergesi */}
          {(stats?.unresolved_errors ?? 0) > 0 && (
            <Pressable
              onPress={() => router.push(`/errors`)}
              className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 flex-row items-center gap-2"
            >
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text className="text-red-700 text-sm font-medium flex-1">
                {stats!.unresolved_errors} çözülmemiş hata
              </Text>
              <Text className="text-red-700">›</Text>
            </Pressable>
          )}
        </View>

        {/* Hızlı eylemler */}
        <View className="gap-2 mb-4">
          <View className="flex-row gap-2">
            <ActionChip
              emoji="💬"
              label="Sohbet"
              onPress={() => {
                createLesson.mutate(
                  { subjectId: id },
                  {
                    onSuccess: (l) => router.push(`/lesson/${l.id}`),
                  },
                )
              }}
            />
            <ActionChip
              emoji="📝"
              label={generateQuizMutation.isPending ? 'Üretiliyor...' : 'Quiz Üret'}
              onPress={generateQuiz}
            />
          </View>
          <View className="flex-row gap-2">
            <ActionChip
              emoji="🗺️"
              label="2D Harita"
              onPress={() => router.push(`/subject/${id}/map`)}
            />
            <ActionChip
              emoji="🌐"
              label="3D Harita"
              onPress={() => router.push(`/subject/${id}/map3d`)}
            />
          </View>
          <View className="flex-row gap-2">
            <ActionChip
              emoji="📅"
              label={subject.exam_date ? `Sınav ${daysToExam}g` : 'Sınav Tarihi'}
              onPress={handleSetExamDate}
            />
          </View>
        </View>

        {/* Kavramlar */}
        <View className="flex-row items-center justify-between mb-3 mt-2">
          <Text className="text-lg font-serif text-brand-950">Kavramlar</Text>
          <Pressable
            onPress={() => setAddConceptOpen(true)}
            className="px-3 py-1 bg-brand-950 rounded-full"
          >
            <Text className="text-white text-sm font-semibold">+ Ekle</Text>
          </Pressable>
        </View>

        {cLoading ? (
          <ActivityIndicator color="#1E1B4B" style={{ marginVertical: 20 }} />
        ) : !concepts || concepts.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
            <Text className="text-slate-500 text-center">Henüz kavram yok. İlk kavramı ekle.</Text>
          </View>
        ) : (
          <View className="gap-2">
            {concepts.map((c) => (
              <ConceptRow key={c.id} concept={c} onStart={() => startLessonOnConcept(c.id)} />
            ))}
          </View>
        )}

        {/* Tehlikeli bölge */}
        <View className="mt-8 mb-8">
          <Pressable onPress={handleDelete} className="py-3 items-center">
            <Text className="text-red-500 text-sm">Konuyu Sil</Text>
          </Pressable>
        </View>
      </ScrollView>

      <AddConceptModal
        visible={addConceptOpen}
        onClose={() => setAddConceptOpen(false)}
        subjectId={id!}
      />
    </SafeAreaView>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-1">
      <Text className={`text-xl font-bold ${highlight ? 'text-red-600' : 'text-brand-950'}`}>
        {value}
      </Text>
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  )
}

function ActionChip({
  emoji,
  label,
  onPress,
}: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-white rounded-xl p-3 border border-slate-100 items-center active:opacity-70"
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text className="text-xs text-brand-950 font-medium mt-1" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

function ConceptRow({ concept, onStart }: { concept: ConceptWithProgress; onStart: () => void }) {
  const mastery = concept.progress?.mastery_score ?? 0
  const isDue = concept.progress?.next_review_at
    ? new Date(concept.progress.next_review_at) <= new Date()
    : concept.progress?.repetitions === 0

  return (
    <Pressable
      onPress={onStart}
      className="bg-white rounded-2xl p-4 border border-slate-100 active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-brand-950">{concept.name}</Text>
            {isDue && (
              <View className="bg-accent-500/20 px-2 py-0.5 rounded">
                <Text className="text-accent-700 text-xs font-semibold">Tekrar!</Text>
              </View>
            )}
          </View>
          {concept.description && (
            <Text className="text-slate-500 text-xs mt-1" numberOfLines={2}>
              {concept.description}
            </Text>
          )}
          {/* Mastery bar */}
          <View className="flex-row items-center gap-2 mt-2">
            <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <View
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.max(2, mastery)}%`,
                  backgroundColor: mastery > 70 ? '#059669' : mastery > 40 ? '#F59E0B' : '#1E1B4B',
                }}
              />
            </View>
            <Text className="text-xs text-slate-500 font-mono">%{Math.round(mastery)}</Text>
          </View>
        </View>
        <Text className="text-slate-400 text-xl">›</Text>
      </View>
    </Pressable>
  )
}

function AddConceptModal({
  visible,
  onClose,
  subjectId,
}: { visible: boolean; onClose: () => void; subjectId: string }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const create = useCreateConcept()

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('', 'Kavram ismi boş olamaz')
      return
    }
    create.mutate(
      { subjectId, name: name.trim(), description: description.trim() || undefined, difficulty },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          setDifficulty(3)
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
          <Text className="text-2xl font-serif text-brand-950 mb-4">Yeni Kavram</Text>

          <Input
            label="İsim"
            value={name}
            onChangeText={setName}
            placeholder="Örn: Türev, Fotosentez"
          />
          <Input
            label="Açıklama (ops.)"
            value={description}
            onChangeText={setDescription}
            placeholder="Kısa tanım — RAG için önemli"
          />

          <Text className="text-xs font-semibold text-slate-400 uppercase mt-2 mb-2">Zorluk</Text>
          <View className="flex-row gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setDifficulty(n)}
                className="flex-1 p-2 items-center"
              >
                <Text style={{ fontSize: 28 }}>{n <= difficulty ? '⭐' : '☆'}</Text>
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
              <Button title="Ekle" onPress={handleAdd} loading={create.isPending} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
