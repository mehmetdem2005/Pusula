import { Audio } from 'expo-av'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MermaidView } from '../../../../src/components/notebook/MermaidView'
import { Icon } from '../../../../src/components/ui/Icon'
import {
  useGeneratedContent,
  usePodcastManifest,
  useSynthesizePodcast,
} from '../../../../src/hooks/useNotebooks'
import { apiFetch } from '../../../../src/lib/api'

export default function StudioDetail() {
  const router = useRouter()
  const { sid } = useLocalSearchParams<{ id: string; sid: string }>()
  const { data: gen, isLoading } = useGeneratedContent(sid ?? null)

  if (isLoading || !gen) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: gen.title,
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 16 },
        }}
      />

      {gen.status === 'pending' || gen.status === 'processing' ? (
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text className="font-serif text-2xl text-ink-900 mt-4">Üretiliyor...</Text>
          <Text className="text-sm text-slate-500 text-center mt-2 max-w-[300px]">
            {gen.content_type === 'audio_overview'
              ? 'AI senin için podcast yazıp 2 sesle okuyor. 1-2 dakika.'
              : 'Birkaç saniye içinde hazır olur.'}
          </Text>
        </View>
      ) : gen.status === 'failed' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Icon name="alert-triangle" size={40} color="#EF4444" />
          <Text className="font-serif text-2xl text-ink-900 mt-3">Hata oluştu</Text>
          <Text className="text-sm text-slate-500 text-center mt-2">{gen.error_message}</Text>
        </View>
      ) : gen.content_type === 'audio_overview' ? (
        <PodcastPlayer generated={gen} />
      ) : gen.content_type === 'flashcards' ? (
        <FlashcardsViewer raw={gen.raw_content} />
      ) : gen.content_type === 'quiz' ? (
        <QuizViewer raw={gen.raw_content} />
      ) : gen.content_type === 'slides' ? (
        <SlidesViewer raw={gen.raw_content} generatedId={gen.id} />
      ) : gen.content_type === 'summary' ? (
        <SummaryViewer raw={gen.raw_content} />
      ) : gen.content_type === 'infographic' ? (
        <InfographicViewer raw={gen.raw_content} />
      ) : null}
    </SafeAreaView>
  )
}

// ============ PODCAST PLAYER ============

function PodcastPlayer({ generated }: { generated: any }) {
  const synthesize = useSynthesizePodcast()
  const { data: manifest, refetch } = usePodcastManifest(generated.id)
  const [synthStarted, setSynthStarted] = useState(false)

  const soundRef = useRef<Audio.Sound | null>(null)
  const [currentSegment, setCurrentSegment] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    // Eğer storage_path yoksa synthesize başlat
    if (!generated.storage_path && !synthStarted && generated.status === 'ready') {
      setSynthStarted(true)
      synthesize.mutate(generated.id, {
        onSuccess: () => setTimeout(() => refetch(), 5000),
      })
    }
  }, [generated.storage_path])

  const playSegment = async (idx: number) => {
    if (!manifest || !manifest.segments[idx]) return
    if (soundRef.current) {
      await soundRef.current.unloadAsync()
      soundRef.current = null
    }
    const seg = manifest.segments[idx]
    const { sound } = await Audio.Sound.createAsync({ uri: seg.audioUrl }, { shouldPlay: true })
    soundRef.current = sound
    setIsPlaying(true)

    sound.setOnPlaybackStatusUpdate((s: any) => {
      if (s.didJustFinish) {
        setIsPlaying(false)
        if (idx + 1 < manifest.segments.length) {
          setCurrentSegment(idx + 1)
          setTimeout(() => playSegment(idx + 1), 200)
        }
      }
    })
  }

  const togglePlay = async () => {
    if (!manifest) return
    if (!soundRef.current) {
      await playSegment(currentSegment)
      return
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync()
      setIsPlaying(false)
    } else {
      await soundRef.current.playAsync()
      setIsPlaying(true)
    }
  }

  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync()
    }
  }, [])

  if (!manifest) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <ActivityIndicator color="#F59E0B" />
        <Text className="text-sm text-slate-500 mt-3">
          {synthesize.isPending ? 'Sesler üretiliyor...' : 'Manifest hazırlanıyor...'}
        </Text>
      </View>
    )
  }

  const totalMin = Math.round(manifest.totalDurationMs / 60000)
  const seg = manifest.segments[currentSegment]

  return (
    <View className="flex-1">
      {/* Big play button + waveform feel */}
      <View className="px-6 py-8 items-center bg-cream-50">
        <View className="flex-row items-center gap-2 mb-6">
          {['A', 'B'].map((spkr, i) => (
            <View
              key={spkr}
              className={`flex-row items-center gap-1.5 ${
                seg?.speaker === spkr ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: spkr === 'A' ? '#F59E0B' : '#7C3AED' }}
              />
              <Text className="text-xs font-bold text-ink-900">
                {spkr === 'A' ? 'Ela' : 'Mert'}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={togglePlay}
          className="w-24 h-24 bg-ink-900 rounded-full items-center justify-center mb-4"
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={36} color="#F59E0B" />
        </Pressable>

        <Text className="font-mono text-xs text-slate-500">
          {currentSegment + 1} / {manifest.totalTurns} · {totalMin} dk
        </Text>
      </View>

      {/* Current line */}
      <View className="px-6 pb-3 border-t border-slate-100 pt-4">
        <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
          Şimdi konuşan: {seg?.speaker === 'A' ? 'Ela' : 'Mert'}
        </Text>
        <Text className="font-serif text-base text-ink-900 leading-6 italic">"{seg?.text}"</Text>
      </View>

      {/* Transcript scroll */}
      <ScrollView className="flex-1 px-4 pt-2" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2 px-1">
          Transkript
        </Text>
        {manifest.segments.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => {
              setCurrentSegment(i)
              playSegment(i)
            }}
            className={`mb-2 p-2 rounded-xl ${currentSegment === i ? 'bg-amber-50 border border-amber-200' : ''}`}
          >
            <Text
              className={`text-[11px] font-bold mb-0.5 ${
                s.speaker === 'A' ? 'text-amber-700' : 'text-purple-700'
              }`}
            >
              {s.speaker === 'A' ? 'Ela' : 'Mert'}
            </Text>
            <Text className="text-sm text-ink-900 leading-5">{s.text}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

// ============ FLASHCARDS VIEWER ============

function FlashcardsViewer({ raw }: { raw: any }) {
  const cards = raw?.cards ?? []
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (cards.length === 0)
    return (
      <View className="p-6">
        <Text>Kart yok</Text>
      </View>
    )

  const card = cards[idx]

  return (
    <View className="flex-1">
      <View className="px-4 pt-3">
        <Text className="text-xs text-slate-500 font-mono">
          {idx + 1} / {cards.length}
        </Text>
        <View className="h-1 bg-slate-200 rounded-full mt-1.5">
          <View
            className="h-full bg-amber-500 rounded-full"
            style={{ width: `${((idx + 1) / cards.length) * 100}%` }}
          />
        </View>
      </View>

      <View className="flex-1 px-5 pt-4 justify-center">
        <Pressable
          onPress={() => setRevealed(!revealed)}
          className="bg-white border border-slate-100 rounded-3xl p-6 min-h-[280px] justify-center"
        >
          <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-3 text-center">
            {!revealed ? (card.type === 'cloze' ? 'Boşluğu Doldur' : 'Soru') : 'Cevap'}
          </Text>
          <Text className="font-serif text-2xl text-ink-900 text-center leading-tight">
            {!revealed ? card.front : card.back}
          </Text>
          <Text className="text-[10px] text-slate-400 text-center mt-6">
            {!revealed ? 'Cevabı görmek için dokun' : 'Devam için aşağıdaki butonlardan birini seç'}
          </Text>
        </Pressable>
      </View>

      {revealed && (
        <View className="px-5 pb-6 flex-row gap-2">
          <Pressable
            onPress={() => {
              if (idx > 0) {
                setIdx(idx - 1)
                setRevealed(false)
              }
            }}
            disabled={idx === 0}
            className="bg-white border border-slate-200 rounded-2xl px-5 py-3"
          >
            <Icon name="chevron-left" size={18} color="#1E1B4B" />
          </Pressable>
          <Pressable
            onPress={() => {
              if (idx < cards.length - 1) {
                setIdx(idx + 1)
                setRevealed(false)
              }
            }}
            className="flex-1 bg-ink-900 rounded-2xl py-3 items-center"
          >
            <Text className="text-cream-50 font-semibold">Sonraki</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

// ============ QUIZ VIEWER ============

function QuizViewer({ raw }: { raw: any }) {
  const questions = raw?.questions ?? []
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)

  if (questions.length === 0)
    return (
      <View className="p-6">
        <Text>Soru yok</Text>
      </View>
    )

  const q = questions[idx]
  const isCorrect = selected === q.correctIndex

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text className="text-xs text-slate-500 font-mono">
        Soru {idx + 1} / {questions.length}
      </Text>
      <Text className="text-xs text-emerald-700 font-mono mt-0.5">
        Skor: {score} / {questions.length}
      </Text>

      <Text className="font-serif text-xl text-ink-900 mt-4 leading-7">{q.question}</Text>

      <View className="mt-5 gap-2">
        {q.options.map((opt: string, i: number) => {
          const isSelected = selected === i
          const isCorrectOpt = i === q.correctIndex
          let bg = 'bg-white border-slate-200'
          if (showResult) {
            if (isCorrectOpt) bg = 'bg-emerald-50 border-emerald-500'
            else if (isSelected) bg = 'bg-red-50 border-red-500'
          } else if (isSelected) {
            bg = 'bg-amber-50 border-amber-500'
          }

          return (
            <Pressable
              key={i}
              onPress={() => {
                if (!showResult) setSelected(i)
              }}
              className={`border rounded-2xl p-4 flex-row items-center gap-3 ${bg}`}
            >
              <View className="w-7 h-7 rounded-full border border-slate-300 items-center justify-center">
                <Text className="text-xs font-bold text-slate-700">
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text className="flex-1 text-sm text-ink-900">{opt}</Text>
              {showResult && isCorrectOpt && <Icon name="check-circle" size={16} color="#10B981" />}
            </Pressable>
          )
        })}
      </View>

      {!showResult && selected !== null && (
        <Pressable
          onPress={() => {
            setShowResult(true)
            if (isCorrect) setScore(score + 1)
          }}
          className="bg-ink-900 rounded-2xl py-3 mt-5 items-center"
        >
          <Text className="text-cream-50 font-semibold">Cevabı Göster</Text>
        </Pressable>
      )}

      {showResult && (
        <>
          <View
            className={`mt-5 p-3 rounded-2xl ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}
          >
            <Text
              className={`text-xs font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'} mb-1`}
            >
              {isCorrect ? '✓ DOĞRU' : '✗ YANLIŞ'}
            </Text>
            <Text className="text-sm text-ink-900 leading-5">{q.explanation}</Text>
          </View>

          {idx + 1 < questions.length && (
            <Pressable
              onPress={() => {
                setIdx(idx + 1)
                setSelected(null)
                setShowResult(false)
              }}
              className="bg-amber-500 rounded-2xl py-3 mt-3 items-center"
            >
              <Text className="text-ink-900 font-semibold">Sonraki Soru</Text>
            </Pressable>
          )}
          {idx + 1 === questions.length && (
            <View className="mt-4 bg-cream-100 rounded-2xl p-4 items-center">
              <Text className="font-serif text-2xl text-ink-900">Test Bitti!</Text>
              <Text className="text-sm text-slate-700 mt-1">
                {score} / {questions.length} doğru
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

// ============ SLIDES VIEWER ============

function SlidesViewer({ raw, generatedId }: { raw: any; generatedId?: string }) {
  const slides = raw?.slides ?? []
  const [idx, setIdx] = useState(0)
  const [exporting, setExporting] = useState(false)

  if (slides.length === 0)
    return (
      <View className="p-6">
        <Text>Slayt yok</Text>
      </View>
    )

  const s = slides[idx]

  const handleExport = async () => {
    if (!generatedId) return
    setExporting(true)
    try {
      const res = await apiFetch<{ url: string; fileName: string }>(
        `/api/studio/${generatedId}/export-pptx`,
        { method: 'POST' },
      )
      if (res.url) {
        await Linking.openURL(res.url)
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'PPTX export başarısız')
    }
    setExporting(false)
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
        <View className="bg-white border border-slate-100 rounded-3xl p-8 min-h-[400px] justify-center">
          {s.layout === 'title' && (
            <>
              <Text className="font-serif text-4xl text-ink-900 leading-tight">{s.title}</Text>
              {s.subtitle && <Text className="text-base text-slate-600 mt-3">{s.subtitle}</Text>}
            </>
          )}
          {s.layout === 'bullet' && (
            <>
              {s.title && <Text className="font-serif text-2xl text-ink-900 mb-4">{s.title}</Text>}
              {(s.bullets ?? []).map((b: string, i: number) => (
                <View key={i} className="flex-row gap-3 mb-3">
                  <Text className="text-amber-500 font-bold text-base">→</Text>
                  <Text className="flex-1 text-base text-ink-900 leading-6">{b}</Text>
                </View>
              ))}
            </>
          )}
          {s.layout === 'quote' && (
            <>
              <Text className="font-serif text-2xl text-ink-900 italic leading-tight">
                "{s.quote}"
              </Text>
              {s.author && (
                <Text className="text-sm text-slate-600 mt-3 text-right">— {s.author}</Text>
              )}
            </>
          )}
          {s.layout === 'closing' && (
            <View className="items-center">
              <Text className="font-serif text-4xl text-amber-500 italic">
                {s.title ?? 'Teşekkürler'}
              </Text>
              {s.subtitle && <Text className="text-base text-slate-600 mt-3">{s.subtitle}</Text>}
            </View>
          )}
        </View>

        {s.speakerNotes && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-3">
            <Text className="font-mono text-[9px] text-amber-700 tracking-widest uppercase mb-1">
              Konuşma Notu
            </Text>
            <Text className="text-xs text-ink-900 leading-5">{s.speakerNotes}</Text>
          </View>
        )}
      </ScrollView>

      <View className="flex-row gap-2 px-5 pb-5">
        <Pressable
          onPress={() => idx > 0 && setIdx(idx - 1)}
          disabled={idx === 0}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2"
        >
          <Icon name="chevron-left" size={16} color="#1E1B4B" />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text className="text-xs text-slate-500 font-mono">
            {idx + 1} / {slides.length}
          </Text>
        </View>
        <Pressable
          onPress={handleExport}
          disabled={exporting || !generatedId}
          className="bg-amber-500 rounded-xl px-3 py-2 flex-row items-center gap-1.5"
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#1E1B4B" />
          ) : (
            <>
              <Icon name="download" size={14} color="#1E1B4B" />
              <Text className="text-[11px] text-ink-900 font-bold">.pptx</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={() => idx < slides.length - 1 && setIdx(idx + 1)}
          disabled={idx === slides.length - 1}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2"
        >
          <Icon name="chevron-right" size={16} color="#1E1B4B" />
        </Pressable>
      </View>
    </View>
  )
}

// ============ SUMMARY VIEWER ============

function SummaryViewer({ raw }: { raw: any }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text className="font-serif text-3xl text-ink-900 leading-tight">{raw?.title}</Text>
      <Text className="text-base text-ink-900 leading-7 mt-5">{raw?.summary}</Text>

      {raw?.keyPoints && raw.keyPoints.length > 0 && (
        <View className="mt-6">
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            Anahtar Noktalar
          </Text>
          {raw.keyPoints.map((p: string, i: number) => (
            <View key={i} className="flex-row gap-2 mb-2">
              <Text className="text-amber-500 font-bold">•</Text>
              <Text className="flex-1 text-sm text-ink-900 leading-5">{p}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

// ============ INFOGRAPHIC VIEWER ============

function InfographicViewer({ raw }: { raw: any }) {
  const [showSource, setShowSource] = useState(false)

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text className="font-serif text-2xl text-ink-900">{raw?.title}</Text>
      <Text className="text-sm text-slate-600 mt-2 mb-4">{raw?.description}</Text>

      {/* Gerçek mermaid render */}
      {raw?.mermaid && <MermaidView code={raw.mermaid} height={400} />}

      <Pressable
        onPress={() => setShowSource(!showSource)}
        className="mt-3 flex-row items-center gap-1.5"
      >
        <Icon name={showSource ? 'chevron-up' : 'chevron-down'} size={12} color="#64748B" />
        <Text className="text-[11px] text-slate-600 underline">
          {showSource ? 'Kaynağı gizle' : 'Mermaid kaynağını göster'}
        </Text>
      </Pressable>

      {showSource && (
        <View className="bg-ink-950 rounded-2xl p-4 mt-2">
          <Text className="font-mono text-xs text-cream-50" selectable>
            {raw?.mermaid}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
