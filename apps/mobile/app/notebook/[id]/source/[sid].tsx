import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import YoutubePlayer from 'react-native-youtube-iframe'
import { Icon } from '../../../../src/components/ui/Icon'
import { apiFetch } from '../../../../src/lib/api'

interface Source {
  id: string
  title: string
  external_url: string | null
  metadata: any
  youtube_video_id: string | null
  youtube_duration_seconds: number | null
  youtube_channel_name: string | null
  transcript_source: string | null
  language: string | null
  status: string
}

interface Chunk {
  id: string
  chunk_index: number
  text: string
  start_time_ms: number
  end_time_ms: number
}

interface Translation {
  id: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  translations: Record<string, string>
  translated_chunks: number
  total_chunks: number
}

const TARGET_LANGS: Array<{ code: string; label: string }> = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
]

export default function YouTubeSourceViewer() {
  const router = useRouter()
  const { sid } = useLocalSearchParams<{ sid: string }>()
  const [source, setSource] = useState<Source | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)

  // Translation
  const [translation, setTranslation] = useState<Translation | null>(null)
  const [translateLang, setTranslateLang] = useState<string | null>(null)
  const [translateMenuOpen, setTranslateMenuOpen] = useState(false)
  const [translateLoading, setTranslateLoading] = useState(false)

  const playerRef = useRef<any>(null)
  const scrollRef = useRef<ScrollView>(null)
  const chunkRefs = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    ;(async () => {
      try {
        const s = await apiFetch<Source>(`/api/sources/${sid}`)
        setSource(s)

        // Chunks fetch (custom endpoint or direct)
        const chunkRes = await apiFetch<{ chunks: Chunk[] }>(`/api/sources/${sid}/chunks`)
        setChunks(chunkRes.chunks ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [sid])

  // Polling current time
  useEffect(() => {
    if (!playing || !playerRef.current) return
    const id = setInterval(async () => {
      try {
        const sec = await playerRef.current.getCurrentTime()
        setCurrentTimeMs(Math.round(sec * 1000))
      } catch {}
    }, 500)
    return () => clearInterval(id)
  }, [playing])

  // Translation polling (status pending/processing iken)
  useEffect(() => {
    if (!translation || translation.status === 'ready' || translation.status === 'failed') return
    if (!translateLang) return

    const id = setInterval(async () => {
      try {
        const r = await apiFetch<{ translation: Translation }>(
          `/api/translations/${sid}/${translateLang}`,
        )
        if (r.translation) setTranslation(r.translation)
      } catch {}
    }, 3000)

    return () => clearInterval(id)
  }, [translation, translateLang, sid])

  const handleSelectLang = async (langCode: string) => {
    setTranslateMenuOpen(false)
    setTranslateLang(langCode)
    setTranslateLoading(true)

    try {
      // Önce cache check
      const r = await apiFetch<{ translation: Translation | null }>(
        `/api/translations/${sid}/${langCode}`,
      )

      if (r.translation?.status === 'ready') {
        setTranslation(r.translation)
      } else {
        // Yeni çeviri başlat
        const start = await apiFetch<{ translation: Translation }>('/api/translations', {
          method: 'POST',
          body: JSON.stringify({ sourceId: sid, targetLanguage: langCode }),
        })
        setTranslation(start.translation)
      }
    } catch (e: any) {
      if (e.message?.includes('pro_required')) {
        Alert.alert('Pro Özellik', 'YouTube çevirisi Pro üyelere özeldir.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Pro Ol', onPress: () => router.push('/upgrade') },
        ])
      } else {
        Alert.alert('Hata', e.message)
      }
      setTranslateLang(null)
    }
    setTranslateLoading(false)
  }

  const clearTranslation = () => {
    setTranslation(null)
    setTranslateLang(null)
  }

  // Auto-scroll to current chunk
  useEffect(() => {
    const currentChunk = chunks.find(
      (c) => currentTimeMs >= c.start_time_ms && currentTimeMs <= c.end_time_ms,
    )
    if (currentChunk) {
      const y = chunkRefs.current.get(currentChunk.chunk_index)
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true })
      }
    }
  }, [currentTimeMs, chunks])

  const seekTo = async (ms: number) => {
    if (playerRef.current) {
      await playerRef.current.seekTo(ms / 1000, true)
      setPlaying(true)
    }
  }

  if (loading || !source || !source.youtube_video_id) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  const screenWidth = Dimensions.get('window').width

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen
        options={{
          title: source.title,
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 16 },
        }}
      />

      {/* YouTube Player */}
      <View className="bg-black">
        <YoutubePlayer
          ref={playerRef}
          height={(screenWidth * 9) / 16}
          width={screenWidth}
          videoId={source.youtube_video_id}
          play={playing}
          onChangeState={(state: string) => {
            if (state === 'ended') setPlaying(false)
            if (state === 'paused') setPlaying(false)
            if (state === 'playing') setPlaying(true)
          }}
          webViewStyle={{ opacity: 0.99 }} // iOS layout fix
        />
      </View>

      {/* Source meta */}
      <View className="px-4 py-3 border-b border-slate-100 flex-row items-center gap-3">
        <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center">
          <Icon name="play" size={18} color="#DB2777" />
        </View>
        <View className="flex-1">
          <Text className="font-serif text-sm text-ink-900" numberOfLines={1}>
            {source.title}
          </Text>
          <Text className="text-[10px] text-slate-500 mt-0.5">
            {chunks.length} pasaj · {Math.round((source.youtube_duration_seconds ?? 0) / 60)} dk
            {source.transcript_source
              ? ` · ${transcriptSourceLabel(source.transcript_source)}`
              : ''}
            {translateLang ? ` · → ${translateLang.toUpperCase()}` : ''}
          </Text>
        </View>

        {/* Çeviri butonu */}
        <Pressable
          onPress={() =>
            translation ? clearTranslation() : setTranslateMenuOpen(!translateMenuOpen)
          }
          className={`rounded-full px-3 py-1.5 flex-row items-center gap-1.5 ${
            translation ? 'bg-amber-500' : 'bg-cyan-50 border border-cyan-200'
          }`}
        >
          <Icon name="languages" size={11} color={translation ? '#1E1B4B' : '#0891B2'} />
          <Text
            className={`text-[10px] font-bold ${translation ? 'text-ink-900' : 'text-cyan-700'}`}
          >
            {translation ? 'Orijinal' : 'Çevir'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/notebook/${source.id}`)}
          className="bg-ink-900 rounded-full px-3 py-1.5 flex-row items-center gap-1.5"
        >
          <Icon name="message-square" size={11} color="#F59E0B" />
          <Text className="text-cream-50 text-[10px] font-bold">Sor</Text>
        </Pressable>
      </View>

      {/* Translation menu */}
      {translateMenuOpen && (
        <View className="bg-cyan-50 border-b border-cyan-200 px-4 py-3">
          <Text className="font-mono text-[9px] text-cyan-700 tracking-widest uppercase mb-2">
            Hedef Dil Seç
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            {TARGET_LANGS.filter((l) => l.code !== source.language).map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => handleSelectLang(lang.code)}
                className="bg-white border border-cyan-300 rounded-full px-3 py-1.5"
              >
                <Text className="text-xs text-cyan-900 font-semibold">{lang.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Translation progress */}
      {translation && translation.status !== 'ready' && (
        <View className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#F59E0B" />
          <Text className="flex-1 text-xs text-amber-900">
            Çeviriliyor... {translation.translated_chunks}/{translation.total_chunks} pasaj
          </Text>
        </View>
      )}

      {/* Transcript */}
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-3">
          Transkript — Zaman damgalı
        </Text>

        {chunks.map((chunk) => {
          const isActive =
            currentTimeMs >= chunk.start_time_ms && currentTimeMs <= chunk.end_time_ms
          const translatedText = translation?.translations?.[String(chunk.chunk_index)]
          const displayText = translatedText ?? chunk.text
          return (
            <Pressable
              key={chunk.id}
              onPress={() => seekTo(chunk.start_time_ms)}
              onLayout={(e) => chunkRefs.current.set(chunk.chunk_index, e.nativeEvent.layout.y)}
              className={`mb-3 p-3 rounded-2xl border ${
                isActive ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-100'
              }`}
            >
              <View className="flex-row items-center gap-2 mb-1.5">
                <View
                  className={`px-2 py-0.5 rounded ${isActive ? 'bg-amber-500' : 'bg-slate-100'}`}
                >
                  <Text
                    className={`font-mono text-[10px] font-bold ${isActive ? 'text-ink-900' : 'text-slate-700'}`}
                  >
                    {formatTimestamp(chunk.start_time_ms)}
                  </Text>
                </View>
                {translatedText && (
                  <View className="bg-cyan-100 px-1.5 py-0.5 rounded">
                    <Text className="font-mono text-[8px] text-cyan-700 font-bold uppercase">
                      Çevirili
                    </Text>
                  </View>
                )}
                {isActive && <Icon name="play" size={10} color="#F59E0B" />}
              </View>
              <Text className={`text-sm leading-5 ${isActive ? 'text-ink-900' : 'text-slate-700'}`}>
                {displayText}
              </Text>
              {translatedText && translation?.status === 'ready' && (
                <Pressable
                  onPress={() => {
                    Alert.alert('Orijinal', chunk.text, [{ text: 'Tamam' }])
                  }}
                >
                  <Text className="text-[10px] text-cyan-700 mt-1.5 underline">
                    Orijinali göster
                  </Text>
                </Pressable>
              )}
            </Pressable>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function transcriptSourceLabel(src: string): string {
  switch (src) {
    case 'supadata-auto':
      return 'Resmi altyazı'
    case 'supadata-asr':
      return 'Otomatik altyazı'
    case 'youtube-scrape':
      return 'Altyazı'
    case 'whisper-fallback':
      return 'Whisper transkripti'
    default:
      return 'Transkript'
  }
}
