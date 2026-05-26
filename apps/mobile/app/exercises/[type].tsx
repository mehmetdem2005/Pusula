import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KaraokeTTSPlayer } from '../../src/components/reader/KaraokeTTSPlayer'
import { Icon } from '../../src/components/ui/Icon'
import { type VocabSRSCard, useRateVocabCard, useVocabQueue } from '../../src/hooks/useVocabReview'

type ExerciseType =
  | 'mixed'
  | 'flashcard'
  | 'multiple-choice'
  | 'word-formation'
  | 'cloze'
  | 'listening'

const MODE_LABEL: Record<ExerciseType, string> = {
  mixed: 'Karışık Tekrar',
  flashcard: 'Kartlar',
  'multiple-choice': 'Çoktan Seçmeli',
  'word-formation': 'Kelime Oluştur',
  cloze: 'Boşluk Doldurma',
  listening: 'Dinleme',
}

// mixed modunda her karta atanabilecek modlar
const MIXED_POOL: ExerciseType[] = [
  'multiple-choice',
  'word-formation',
  'cloze',
  'flashcard',
  'listening',
]

function meaningOf(v: VocabSRSCard['user_vocabulary']): string {
  const t = v.translations as any
  if (Array.isArray(t)) return t[0]?.translations?.[0] ?? t[0]?.text ?? ''
  return ''
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export default function ExerciseSession() {
  const router = useRouter()
  const params = useLocalSearchParams<{ type: string }>()
  const type = (params.type ?? 'mixed') as ExerciseType
  const { data, isLoading, refetch } = useVocabQueue({ limit: 30 })
  const rate = useRateVocabCard()

  const [idx, setIdx] = useState(0)
  const [stats, setStats] = useState({ done: 0, correct: 0 })
  const startRef = useRef(Date.now())

  const cards = data?.cards ?? []
  const card = cards[idx]
  const total = cards.length

  // Her kart için kullanılacak mod (mixed ise karttan karta değişir, deterministik)
  const cardMode: ExerciseType = useMemo(() => {
    if (type !== 'mixed') return type
    if (!card) return 'flashcard'
    return MIXED_POOL[idx % MIXED_POOL.length]!
  }, [type, idx, card])

  // Tüm kuyruktaki anlamlar/kelimeler — çeldirici üretmek için
  const allMeanings = useMemo(
    () => cards.map((c) => meaningOf(c.user_vocabulary)).filter(Boolean),
    [cards],
  )
  const allWords = useMemo(
    () => cards.map((c) => c.user_vocabulary.word).filter(Boolean),
    [cards],
  )

  useEffect(() => {
    startRef.current = Date.now()
  }, [idx])

  const advance = async (rating: 1 | 2 | 3 | 4) => {
    if (!card) return
    const durationMs = Date.now() - startRef.current
    setStats((s) => ({ done: s.done + 1, correct: s.correct + (rating >= 3 ? 1 : 0) }))
    try {
      await rate.mutateAsync({ cardId: card.id, rating, durationMs })
    } catch (e) {
      console.warn('rate hatası', e)
    }
    if (idx + 1 >= total) {
      const fresh = await refetch()
      if (fresh.data && fresh.data.cards.length > 0) setIdx(0)
      else setIdx(total) // bitiş ekranı
    } else {
      setIdx((i) => i + 1)
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  if (!card) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <Stack.Screen
          options={{ title: MODE_LABEL[type] ?? 'Egzersiz', headerStyle: { backgroundColor: '#FBF8F0' } }}
        />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-4">
            <Icon name="check-circle" size={40} color="#10B981" />
          </View>
          <Text className="font-serif text-2xl text-ink-900">Harika iş!</Text>
          <Text className="text-sm text-slate-500 text-center mt-2 max-w-[280px]">
            {stats.done > 0
              ? `${stats.done} kart çalıştın · ${stats.correct} doğru. Bugünlük egzersiz bitti.`
              : 'Şu an çalışacak kart yok. Önce kelime ekle (kitap oku ya da kelime defteri).'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 bg-ink-900 rounded-full px-6 py-3 flex-row items-center gap-2"
          >
            <Icon name="arrow-left" size={16} color="#F59E0B" />
            <Text className="text-cream-50 font-semibold text-sm">Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const progress = ((idx + 1) / total) * 100

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: `${MODE_LABEL[cardMode]} · ${idx + 1}/${total}`,
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'JetBrainsMono', fontSize: 13 },
        }}
      />
      <View className="px-4 pt-2">
        <View className="h-1 bg-slate-200 rounded-full">
          <View className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <ExerciseCard
        key={card.id}
        card={card}
        mode={cardMode}
        distractMeanings={allMeanings}
        distractWords={allWords}
        onResult={advance}
      />
    </SafeAreaView>
  )
}

function ExerciseCard({
  card,
  mode,
  distractMeanings,
  distractWords,
  onResult,
}: {
  card: VocabSRSCard
  mode: ExerciseType
  distractMeanings: string[]
  distractWords: string[]
  onResult: (rating: 1 | 2 | 3 | 4) => void
}) {
  const v = card.user_vocabulary
  const meaning = meaningOf(v)

  if (mode === 'multiple-choice') {
    return (
      <ChoiceExercise
        prompt={v.word}
        sub={v.ipa ? `[${v.ipa}]` : undefined}
        ttsText={v.word}
        ttsLang={v.language}
        correct={meaning}
        pool={distractMeanings}
        onResult={onResult}
      />
    )
  }
  if (mode === 'cloze') {
    return (
      <ClozeExercise
        sentence={v.source_sentence}
        word={v.word}
        meaning={meaning}
        ttsLang={v.language}
        pool={distractWords}
        onResult={onResult}
      />
    )
  }
  if (mode === 'word-formation') {
    return (
      <WordFormationExercise
        word={v.word}
        meaning={meaning}
        ttsLang={v.language}
        onResult={onResult}
      />
    )
  }
  // flashcard & listening → reveal + self-rate
  return (
    <RevealExercise
      word={v.word}
      ipa={v.ipa}
      meaning={meaning}
      sentence={v.source_sentence}
      ttsLang={v.language}
      hideWord={mode === 'listening'}
      onResult={onResult}
    />
  )
}

function pickOptions(correct: string, pool: string[], n = 4): string[] {
  const others = shuffle(pool.filter((x) => x && x !== correct)).slice(0, n - 1)
  return shuffle([correct, ...others])
}

function ChoiceExercise({
  prompt,
  sub,
  ttsText,
  ttsLang,
  correct,
  pool,
  onResult,
}: {
  prompt: string
  sub?: string
  ttsText: string
  ttsLang: string
  correct: string
  pool: string[]
  onResult: (r: 1 | 2 | 3 | 4) => void
}) {
  const options = useMemo(() => pickOptions(correct, pool), [correct, pool])
  const [picked, setPicked] = useState<string | null>(null)
  const isCorrect = picked === correct

  // Tek seçenek varsa (çeldirici yok) reveal moduna düş
  if (options.length < 2) {
    return (
      <RevealExercise word={prompt} ipa={sub ?? null} meaning={correct} sentence={null} ttsLang={ttsLang} onResult={onResult} />
    )
  }

  return (
    <View className="flex-1 px-5 pt-6">
      <View className="bg-white border border-slate-100 rounded-3xl p-6">
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
          Anlamı seç
        </Text>
        <Text className="font-serif text-4xl text-ink-900">{prompt}</Text>
        {sub && <Text className="text-sm text-slate-500 font-mono mt-1">{sub}</Text>}
        <View className="mt-3 self-start">
          <KaraokeTTSPlayer text={ttsText} language={ttsLang} compact />
        </View>
      </View>

      <View className="mt-4 gap-2.5">
        {options.map((opt) => {
          const chosen = picked === opt
          let bg = 'bg-white border-slate-200'
          if (picked) {
            if (opt === correct) bg = 'bg-emerald-50 border-emerald-400'
            else if (chosen) bg = 'bg-red-50 border-red-400'
            else bg = 'bg-white border-slate-100 opacity-60'
          }
          return (
            <Pressable
              key={opt}
              disabled={!!picked}
              onPress={() => setPicked(opt)}
              className={`border rounded-2xl px-4 py-3.5 ${bg}`}
            >
              <Text className="text-base text-ink-900">{opt || '—'}</Text>
            </Pressable>
          )
        })}
      </View>

      {picked && (
        <Pressable
          onPress={() => onResult(isCorrect ? 3 : 1)}
          className="mt-5 bg-ink-900 rounded-2xl py-4 items-center flex-row justify-center gap-2"
        >
          <Icon name={isCorrect ? 'check-circle' : 'arrow-right'} size={16} color="#F59E0B" />
          <Text className="text-cream-50 font-semibold">
            {isCorrect ? 'Doğru — Devam' : 'Devam'}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

function ClozeExercise({
  sentence,
  word,
  meaning,
  ttsLang,
  pool,
  onResult,
}: {
  sentence: string | null
  word: string
  meaning: string
  ttsLang: string
  pool: string[]
  onResult: (r: 1 | 2 | 3 | 4) => void
}) {
  // Cümle yoksa çoktan seçmeliye düş
  if (!sentence || !sentence.toLowerCase().includes(word.toLowerCase())) {
    return (
      <ChoiceExercise
        prompt={meaning || word}
        ttsText={word}
        ttsLang={ttsLang}
        correct={word}
        pool={pool}
        onResult={onResult}
      />
    )
  }
  const options = useMemo(() => pickOptions(word, pool), [word, pool])
  const [picked, setPicked] = useState<string | null>(null)
  const isCorrect = picked === word
  const blanked = sentence.replace(new RegExp(word, 'i'), '_____')

  return (
    <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
      <View className="bg-white border border-slate-100 rounded-3xl p-6">
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
          Boşluğu doldur
        </Text>
        <Text className="text-lg text-ink-900 leading-7 italic">"{blanked}"</Text>
        {meaning && (
          <Text className="text-xs text-slate-500 mt-3">İpucu (anlam): {meaning}</Text>
        )}
      </View>
      <View className="mt-4 gap-2.5">
        {options.map((opt) => {
          const chosen = picked === opt
          let bg = 'bg-white border-slate-200'
          if (picked) {
            if (opt === word) bg = 'bg-emerald-50 border-emerald-400'
            else if (chosen) bg = 'bg-red-50 border-red-400'
            else bg = 'bg-white border-slate-100 opacity-60'
          }
          return (
            <Pressable
              key={opt}
              disabled={!!picked}
              onPress={() => setPicked(opt)}
              className={`border rounded-2xl px-4 py-3.5 ${bg}`}
            >
              <Text className="text-base text-ink-900 font-serif">{opt}</Text>
            </Pressable>
          )
        })}
      </View>
      {picked && (
        <Pressable
          onPress={() => onResult(isCorrect ? 3 : 1)}
          className="mt-5 mb-8 bg-ink-900 rounded-2xl py-4 items-center"
        >
          <Text className="text-cream-50 font-semibold">{isCorrect ? 'Doğru — Devam' : 'Devam'}</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

function WordFormationExercise({
  word,
  meaning,
  ttsLang,
  onResult,
}: {
  word: string
  meaning: string
  ttsLang: string
  onResult: (r: 1 | 2 | 3 | 4) => void
}) {
  const letters = useMemo(
    () => shuffle(word.split('')).map((ch, i) => ({ id: `${ch}-${i}`, ch })),
    [word],
  )
  const [built, setBuilt] = useState<{ id: string; ch: string }[]>([])
  const [checked, setChecked] = useState(false)
  const current = built.map((b) => b.ch).join('')
  const isCorrect = current.toLowerCase() === word.toLowerCase()
  const available = letters.filter((l) => !built.some((b) => b.id === l.id))

  return (
    <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
      <View className="bg-white border border-slate-100 rounded-3xl p-6">
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
          Kelimeyi oluştur
        </Text>
        <Text className="font-serif text-2xl text-amber-700">{meaning || '(anlam yok)'}</Text>
        <View className="mt-2 self-start">
          <KaraokeTTSPlayer text={word} language={ttsLang} compact />
        </View>

        {/* Oluşturulan */}
        <View className="mt-5 min-h-[52px] border-b-2 border-dashed border-slate-300 flex-row flex-wrap items-center gap-1.5 pb-2">
          {built.length === 0 ? (
            <Text className="text-slate-300 text-base">Harflere dokun…</Text>
          ) : (
            built.map((b) => (
              <Pressable
                key={b.id}
                disabled={checked}
                onPress={() => setBuilt((s) => s.filter((x) => x.id !== b.id))}
                className="bg-ink-900 rounded-lg px-3 py-2"
              >
                <Text className="text-cream-50 font-bold text-lg">{b.ch}</Text>
              </Pressable>
            ))
          )}
        </View>
      </View>

      {/* Havuz */}
      <View className="mt-5 flex-row flex-wrap gap-2 justify-center">
        {available.map((l) => (
          <Pressable
            key={l.id}
            disabled={checked}
            onPress={() => setBuilt((s) => [...s, l])}
            className="bg-white border border-slate-200 rounded-xl w-12 h-12 items-center justify-center"
          >
            <Text className="text-ink-900 font-bold text-xl">{l.ch}</Text>
          </Pressable>
        ))}
      </View>

      {!checked ? (
        <Pressable
          disabled={built.length !== word.length}
          onPress={() => setChecked(true)}
          className={`mt-6 mb-8 rounded-2xl py-4 items-center ${
            built.length === word.length ? 'bg-ink-900' : 'bg-slate-200'
          }`}
        >
          <Text className={`font-semibold ${built.length === word.length ? 'text-cream-50' : 'text-slate-400'}`}>
            Kontrol Et
          </Text>
        </Pressable>
      ) : (
        <View className="mt-6 mb-8">
          <View className={`rounded-2xl p-4 ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <Text className={`font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Doğru!' : `✗ Doğrusu: ${word}`}
            </Text>
          </View>
          <Pressable
            onPress={() => onResult(isCorrect ? 3 : 1)}
            className="mt-3 bg-ink-900 rounded-2xl py-4 items-center"
          >
            <Text className="text-cream-50 font-semibold">Devam</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}

function RevealExercise({
  word,
  ipa,
  meaning,
  sentence,
  ttsLang,
  hideWord = false,
  onResult,
}: {
  word: string
  ipa: string | null
  meaning: string
  sentence: string | null
  ttsLang: string
  hideWord?: boolean
  onResult: (r: 1 | 2 | 3 | 4) => void
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <View className="flex-1 px-5 pt-6">
      <View className="bg-white border border-slate-100 rounded-3xl p-6 flex-1 justify-between">
        <View>
          {hideWord && !revealed ? (
            <View className="items-center py-6">
              <Text className="text-xs text-slate-500 mb-3">Dinle ve kelimeyi tahmin et</Text>
              <KaraokeTTSPlayer text={word} language={ttsLang} />
            </View>
          ) : (
            <>
              <Text className="font-serif text-5xl text-ink-900">{word}</Text>
              {ipa && <Text className="text-base text-slate-500 font-mono mt-2">[{ipa}]</Text>}
              <View className="mt-4 self-start">
                <KaraokeTTSPlayer text={word} language={ttsLang} compact />
              </View>
            </>
          )}

          {sentence && revealed && (
            <View className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <Text className="text-sm text-ink-900 italic leading-5">"{sentence}"</Text>
            </View>
          )}
        </View>

        {!revealed ? (
          <Pressable
            onPress={() => setRevealed(true)}
            className="bg-ink-900 rounded-2xl py-4 mt-6 items-center"
          >
            <Text className="text-cream-50 font-semibold">
              {hideWord ? 'Kelimeyi Göster' : 'Anlamı Göster'}
            </Text>
          </Pressable>
        ) : (
          <View className="mt-6">
            <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
              Anlam
            </Text>
            <Text className="font-serif text-2xl text-amber-700">{meaning || '—'}</Text>
          </View>
        )}
      </View>

      {revealed && (
        <View className="mt-4 flex-row gap-2">
          {[
            { rating: 1, label: 'Tekrar', color: '#EF4444' },
            { rating: 2, label: 'Zor', color: '#F59E0B' },
            { rating: 3, label: 'İyi', color: '#10B981' },
            { rating: 4, label: 'Kolay', color: '#3B82F6' },
          ].map((b) => (
            <Pressable
              key={b.rating}
              onPress={() => onResult(b.rating as 1 | 2 | 3 | 4)}
              className="flex-1 rounded-2xl py-3.5 items-center"
              style={{ backgroundColor: b.color }}
            >
              <Text className="text-white font-semibold text-sm">{b.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
