import { Reader, useReader } from '@epubjs-react-native/core'
import { useFileSystem } from '@epubjs-react-native/expo-file-system'
import * as FileSystem from 'expo-file-system'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ReaderToolbar } from '../../src/components/reader/ReaderToolbar'
import { SentenceTranslator } from '../../src/components/reader/SentenceTranslator'
import { WordPopup } from '../../src/components/reader/WordPopup'
import { Icon } from '../../src/components/ui/Icon'
import {
  useBook,
  useEndReadingSession,
  useStartReadingSession,
  useUpdateBookProgress,
} from '../../src/hooks/useBooks'
import { supabase } from '../../src/lib/supabase'

const THEMES = {
  light: { body: { background: '#FBF8F0', color: '#1E1B4B' } },
  dark: { body: { background: '#0F0E1F', color: '#FBF8F0' } },
  sepia: { body: { background: '#F5F1E8', color: '#1E1B4B' } },
} as const

export default function EPUBReader() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = useBook(id ?? null)
  const { goToLocation, getLocations } = useReader()

  const updateProgress = useUpdateBookProgress()
  const startSession = useStartReadingSession()
  const endSession = useEndReadingSession()

  const sessionIdRef = useRef<string | null>(null)
  const wordsLookedUpRef = useRef(0)
  const sentencesTranslatedRef = useRef(0)
  const wordsAddedRef = useRef(0)

  const [bookSrc, setBookSrc] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<any>(null)
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light')
  const [fontSize, setFontSize] = useState(110) // %
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const [selectedWord, setSelectedWord] = useState<{ word: string; sentence: string } | null>(null)
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null)

  const book = data?.book

  // Storage'dan EPUB'i indir / signed URL al
  useEffect(() => {
    if (!book?.storage_path) return

    let cancelled = false
    ;(async () => {
      try {
        const { data: urlData } = await supabase.storage
          .from('books')
          .createSignedUrl(book.storage_path!, 60 * 60)

        if (!urlData?.signedUrl) throw new Error('Signed URL alınamadı')

        // Local cache
        const cachePath = `${FileSystem.cacheDirectory}books/${book.id}.epub`
        const cacheDir = `${FileSystem.cacheDirectory}books/`
        const dirInfo = await FileSystem.getInfoAsync(cacheDir)
        if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true })

        const fileInfo = await FileSystem.getInfoAsync(cachePath)
        if (!fileInfo.exists) {
          const { uri } = await FileSystem.downloadAsync(urlData.signedUrl, cachePath)
          if (!cancelled) setBookSrc(uri)
        } else {
          if (!cancelled) setBookSrc(cachePath)
        }
      } catch (e: any) {
        Alert.alert('Hata', e.message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [book?.id, book?.storage_path])

  // Start reading session
  useEffect(() => {
    if (!book) return
    startSession.mutate(
      { bookId: book.id, startPosition: book.current_position ?? 0 },
      {
        onSuccess: (r) => {
          sessionIdRef.current = r.session.id
        },
      },
    )

    return () => {
      // End session on unmount
      if (sessionIdRef.current && currentLocation) {
        endSession.mutate({
          sessionId: sessionIdRef.current,
          endPosition: currentLocation.start?.percentage ?? book.current_position ?? 0,
          wordsLookedUp: wordsLookedUpRef.current,
          sentencesTranslated: sentencesTranslatedRef.current,
          wordsAddedToVocab: wordsAddedRef.current,
        })
      }
    }
  }, [book?.id])

  const handleLocationChange = (totalLocations: number, currentLoc: any) => {
    setCurrentLocation(currentLoc)

    if (currentLoc?.start?.cfi && book) {
      // Periyodik progress kaydet (60 saniyede bir, her location değişiminde değil)
      const now = Date.now()
      const lastSave = (handleLocationChange as any)._lastSave ?? 0
      if (now - lastSave > 30_000) {
        ;(handleLocationChange as any)._lastSave = now
        updateProgress.mutate({
          bookId: book.id,
          currentCfi: currentLoc.start.cfi,
          currentPosition: currentLoc.start.percentage ?? 0,
          readSeconds: 30,
        })
      }
    }
  }

  const handleSelected = (text: string, cfiRange: string) => {
    if (!text.trim()) return

    // Tek kelime mi yoksa cümle mi?
    const trimmed = text.trim()
    const wordCount = trimmed.split(/\s+/).length

    if (wordCount === 1) {
      // Tek kelime — popup
      // Cümleyi bulamasak da kelimeyi gösterebiliriz
      setSelectedWord({ word: trimmed, sentence: '' })
    } else if (wordCount > 1 && wordCount < 50) {
      // Cümle / pasaj — translate modal
      setSelectedSentence(trimmed)
    }
  }

  if (isLoading || !book) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  if (book.format !== 'epub') {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center p-8">
        <Icon name="file" size={48} color="#94A3B8" />
        <Text className="mt-3 text-slate-700 text-center">
          Bu format ({book.format}) için PDF okuyucu kullan
        </Text>
        <Pressable
          onPress={() => router.replace(`/reader-pdf/${book.id}`)}
          className="mt-4 bg-ink-900 rounded-full px-5 py-2.5"
        >
          <Text className="text-cream-50 font-semibold">PDF Okuyucu Aç</Text>
        </Pressable>
      </View>
    )
  }

  if (!bookSrc) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
        <Text className="mt-3 text-slate-500 text-sm">Kitap indiriliyor...</Text>
      </View>
    )
  }

  const progressPct = currentLocation?.start?.percentage
    ? Math.round(currentLocation.start.percentage * 100)
    : Math.round((book.current_position ?? 0) * 100)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        edges={['top']}
        className="flex-1"
        style={{ backgroundColor: theme === 'dark' ? '#0F0E1F' : '#FBF8F0' }}
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* Top bar */}
        <View
          className="flex-row items-center px-4 py-2"
          style={{ backgroundColor: theme === 'dark' ? '#0F0E1F' : '#FBF8F0' }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Icon name="chevron-left" size={26} color={theme === 'dark' ? '#FBF8F0' : '#1E1B4B'} />
          </Pressable>
          <View className="flex-1 px-3">
            <Text
              className="font-serif text-base"
              style={{ color: theme === 'dark' ? '#FBF8F0' : '#1E1B4B' }}
              numberOfLines={1}
            >
              {book.title}
            </Text>
            {book.author && (
              <Text
                className="text-[10px]"
                style={{ color: theme === 'dark' ? '#94A3B8' : '#64748B' }}
              >
                {book.author}
              </Text>
            )}
          </View>
          <Pressable onPress={() => setToolbarVisible(!toolbarVisible)} hitSlop={12}>
            <Icon name="settings" size={20} color={theme === 'dark' ? '#FBF8F0' : '#1E1B4B'} />
          </Pressable>
        </View>

        {/* Reader */}
        <View style={{ flex: 1 }}>
          <Reader
            src={bookSrc}
            fileSystem={useFileSystem}
            onLocationChange={handleLocationChange}
            onSelected={handleSelected}
            initialLocation={book.current_cfi ?? undefined}
            enableSelection
            defaultTheme={THEMES[theme]}
            menuItems={[
              {
                label: '📖 Anlamı',
                action: (cfiRange, text) => {
                  if (text) handleSelected(text, cfiRange)
                  return true
                },
              },
              {
                label: '🌐 Çevir',
                action: (cfiRange, text) => {
                  if (text) setSelectedSentence(text)
                  return true
                },
              },
            ]}
            waitForLocationsReady
          />
        </View>

        {/* Bottom progress */}
        <View
          className="px-4 py-2 flex-row items-center gap-3"
          style={{ backgroundColor: theme === 'dark' ? '#0F0E1F' : '#FBF8F0' }}
        >
          <Text
            className="font-mono text-[10px]"
            style={{ color: theme === 'dark' ? '#94A3B8' : '#64748B' }}
          >
            %{progressPct}
          </Text>
          <View
            className="flex-1 h-0.5"
            style={{ backgroundColor: theme === 'dark' ? '#2D2A5C' : '#E2E8F0' }}
          >
            <View className="h-full bg-amber-500" style={{ width: `${progressPct}%` }} />
          </View>
        </View>

        {/* Toolbar overlay */}
        {toolbarVisible && (
          <ReaderToolbar
            theme={theme}
            fontSize={fontSize}
            onThemeChange={setTheme}
            onFontSizeChange={setFontSize}
            onClose={() => setToolbarVisible(false)}
            bookId={book.id}
            currentCfi={currentLocation?.start?.cfi}
          />
        )}

        {/* Word popup */}
        {selectedWord && (
          <WordPopup
            word={selectedWord.word}
            sentence={selectedWord.sentence}
            sourceLang={book.language}
            targetLang="tr"
            bookId={book.id}
            onClose={() => setSelectedWord(null)}
            onSavedToVocab={() => {
              wordsAddedRef.current++
            }}
            onLookedUp={() => {
              wordsLookedUpRef.current++
            }}
          />
        )}

        {/* Sentence translator */}
        {selectedSentence && (
          <SentenceTranslator
            text={selectedSentence}
            sourceLang={book.language}
            targetLang="tr"
            onClose={() => setSelectedSentence(null)}
            onTranslated={() => {
              sentencesTranslatedRef.current++
            }}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}
