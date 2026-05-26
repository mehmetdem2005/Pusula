import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
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
import {
  type QuizQuestion,
  type SubmitResult,
  useQuiz,
  useSubmitQuiz,
} from '../../src/hooks/useQuiz'

export default function QuizPlay() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = useQuiz(id ?? null)
  const submit = useSubmitQuiz()

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<SubmitResult[] | null>(null)
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null)
  const startTimes = useRef<Record<string, number>>({})

  useEffect(() => {
    if (data) {
      data.questions.forEach((q) => {
        startTimes.current[q.id] = Date.now()
      })
    }
  }, [data])

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  const allAnswered = data.questions.every((q) => answers[q.id])

  const handleSubmit = () => {
    if (!id) return
    if (!allAnswered) {
      Alert.alert('', 'Tüm soruları cevapla')
      return
    }
    const payload = Object.entries(answers).map(([qid, val]) => ({
      questionId: qid,
      userAnswer: val,
      timeSpentMs: Date.now() - (startTimes.current[qid] ?? Date.now()),
    }))
    submit.mutate(
      { quizId: id, answers: payload },
      {
        onSuccess: (r) => {
          setResults(r.results)
          setScore({ correct: r.score, total: r.total })
        },
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  // Sonuç ekranı
  if (results && score) {
    return (
      <ResultsView
        results={results}
        score={score}
        questions={data.questions}
        onClose={() => router.back()}
      />
    )
  }

  // Çözme ekranı
  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: data.quiz.title,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="mb-4">
          <Text className="text-xs text-slate-500 mb-1">
            {Object.keys(answers).length} / {data.questions.length} cevaplandı
          </Text>
          <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <View
              className="h-1.5 bg-brand-950"
              style={{ width: `${(Object.keys(answers).length / data.questions.length) * 100}%` }}
            />
          </View>
        </View>

        <View className="gap-4">
          {data.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i + 1}
              value={answers[q.id] ?? ''}
              onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
            />
          ))}
        </View>

        <View className="my-6">
          <Button
            title={submit.isPending ? 'Gönderiliyor...' : 'Quizi Bitir'}
            onPress={handleSubmit}
            loading={submit.isPending}
            disabled={!allAnswered}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: QuizQuestion
  index: number
  value: string
  onChange: (v: string) => void
}) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100">
      <View className="flex-row items-start gap-2 mb-3">
        <View className="w-7 h-7 rounded-full bg-brand-950 items-center justify-center">
          <Text className="text-white font-bold text-xs">{index}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-brand-950 leading-6">{question.prompt}</Text>
        </View>
      </View>

      {question.type === 'multiple_choice' && question.choices && (
        <View className="gap-2 mt-2">
          {(['a', 'b', 'c', 'd'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              className={[
                'flex-row items-center gap-3 p-3 rounded-xl border',
                value === key ? 'border-brand-950 bg-brand-50' : 'border-slate-100 bg-white',
              ].join(' ')}
            >
              <View
                className={[
                  'w-7 h-7 rounded-full items-center justify-center',
                  value === key ? 'bg-brand-950' : 'bg-slate-100',
                ].join(' ')}
              >
                <Text
                  className={
                    value === key
                      ? 'text-white text-sm font-bold'
                      : 'text-slate-600 text-sm font-bold'
                  }
                >
                  {key.toUpperCase()}
                </Text>
              </View>
              <Text className="flex-1 text-brand-950">{question.choices![key]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {question.type === 'true_false' && (
        <View className="flex-row gap-3 mt-2">
          {(['true', 'false'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              className={[
                'flex-1 p-3 rounded-xl border items-center',
                value === v ? 'border-brand-950 bg-brand-50' : 'border-slate-100 bg-white',
              ].join(' ')}
            >
              <Text className="font-semibold text-brand-950">
                {v === 'true' ? '✓ Doğru' : '✗ Yanlış'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {(question.type === 'open_ended' || question.type === 'fill_blank') && (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Cevabını yaz..."
          placeholderTextColor="#94A3B8"
          multiline={question.type === 'open_ended'}
          className="bg-slate-100 rounded-xl px-4 py-3 text-brand-950 mt-2 min-h-[60px]"
        />
      )}
    </View>
  )
}

function ResultsView({
  results,
  score,
  questions,
  onClose,
}: {
  results: SubmitResult[]
  score: { correct: number; total: number }
  questions: QuizQuestion[]
  onClose: () => void
}) {
  const accuracy = Math.round((score.correct / score.total) * 100)
  const qById = new Map(questions.map((q) => [q.id, q]))

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen options={{ title: 'Sonuç' }} />
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Skor kartı */}
        <View
          className="rounded-3xl p-6 items-center mb-6"
          style={{
            backgroundColor: accuracy >= 70 ? '#059669' : accuracy >= 40 ? '#F59E0B' : '#DC2626',
          }}
        >
          <Text style={{ fontSize: 64 }}>
            {accuracy >= 70 ? '🎉' : accuracy >= 40 ? '💪' : '📚'}
          </Text>
          <Text className="text-white text-5xl font-bold mt-2">%{accuracy}</Text>
          <Text className="text-white/90 mt-1">
            {score.correct} / {score.total} doğru
          </Text>
        </View>

        <Text className="text-xs font-semibold text-slate-400 uppercase mb-2 px-1">Cevaplar</Text>

        <View className="gap-3">
          {results.map((r, i) => {
            const q = qById.get(r.questionId)
            if (!q) return null
            return (
              <View
                key={r.questionId}
                className={[
                  'bg-white rounded-2xl p-4 border-l-4',
                  r.isCorrect ? 'border-green-500' : 'border-red-500',
                ].join(' ')}
                style={{
                  borderTopWidth: 1,
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  borderTopColor: '#E2E8F0',
                  borderRightColor: '#E2E8F0',
                  borderBottomColor: '#E2E8F0',
                }}
              >
                <View className="flex-row items-start gap-2 mb-2">
                  <Text style={{ fontSize: 18 }}>{r.isCorrect ? '✓' : '✗'}</Text>
                  <Text className="flex-1 font-semibold text-brand-950 text-sm">
                    {i + 1}. {q.prompt}
                  </Text>
                </View>

                <View className="ml-7 gap-1">
                  <Text className="text-xs text-slate-500">
                    Senin cevabın:{' '}
                    <Text
                      className={
                        r.isCorrect ? 'text-green-700 font-medium' : 'text-red-600 font-medium'
                      }
                    >
                      {r.userAnswer}
                    </Text>
                  </Text>
                  {!r.isCorrect && (
                    <Text className="text-xs text-slate-500">
                      Doğru: <Text className="text-green-700 font-medium">{r.correctAnswer}</Text>
                    </Text>
                  )}
                  {r.explanation && (
                    <Text className="text-xs text-slate-600 mt-2 leading-5">
                      💡 {r.explanation}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        <View className="my-6">
          <Button title="Bitir" onPress={onClose} fullWidth size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
