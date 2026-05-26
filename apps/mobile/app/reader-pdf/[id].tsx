import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Icon } from '../../src/components/ui/Icon'
import {
  useBook,
  useEndReadingSession,
  useStartReadingSession,
} from '../../src/hooks/useBooks'
import { supabase } from '../../src/lib/supabase'

export default function PDFReader() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = useBook(id ?? null)
  const book = data?.book

  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [webLoading, setWebLoading] = useState(true)

  const startSession = useStartReadingSession()
  const endSession = useEndReadingSession()
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef(Date.now())

  // Signed URL al → Google Docs viewer ile göster
  useEffect(() => {
    if (!book?.storage_path) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: urlData, error: urlErr } = await supabase.storage
          .from('books')
          .createSignedUrl(book.storage_path!, 60 * 60)
        if (urlErr || !urlData?.signedUrl) throw new Error('Dosya bağlantısı alınamadı')
        if (cancelled) return
        const viewer = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
          urlData.signedUrl,
        )}`
        setViewerUrl(viewer)
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'PDF yüklenemedi')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [book?.storage_path])

  // Okuma oturumu başlat/bitir
  useEffect(() => {
    if (!book) return
    startTimeRef.current = Date.now()
    startSession
      .mutateAsync({ bookId: book.id, startPosition: book.current_position ?? 0 })
      .then((r) => {
        sessionIdRef.current = r.session.id
      })
      .catch(() => {})
    return () => {
      if (sessionIdRef.current) {
        endSession
          .mutateAsync({
            sessionId: sessionIdRef.current,
            endPosition: book.current_position ?? 0,
          })
          .catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id])

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  if (!book) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center px-8">
        <Stack.Screen options={{ title: 'PDF', headerStyle: { backgroundColor: '#FBF8F0' } }} />
        <Icon name="file-text" size={40} color="#94A3B8" />
        <Text className="mt-3 text-slate-700">Kitap bulunamadı.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-ink-900 rounded-full px-5 py-2.5">
          <Text className="text-cream-50 font-semibold">Geri</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-left" size={22} color="#1E1B4B" />
        </Pressable>
        <View className="flex-1 min-w-0">
          <Text className="font-serif text-base text-ink-900" numberOfLines={1}>
            {book.title}
          </Text>
          {book.author && (
            <Text className="text-[11px] text-slate-500" numberOfLines={1}>
              {book.author}
            </Text>
          )}
        </View>
        <View className="bg-cream-100 rounded-full px-2 py-0.5">
          <Text className="text-[9px] font-mono text-slate-500 uppercase">PDF</Text>
        </View>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Icon name="alert-circle" size={40} color="#EF4444" />
          <Text className="mt-3 text-slate-700 text-center">{error}</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 bg-ink-900 rounded-full px-5 py-2.5"
          >
            <Text className="text-cream-50 font-semibold">Geri Dön</Text>
          </Pressable>
        </View>
      ) : !viewerUrl ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E1B4B" />
          <Text className="mt-3 text-xs text-slate-500">PDF hazırlanıyor…</Text>
        </View>
      ) : (
        <View className="flex-1">
          <WebView
            source={{ uri: viewerUrl }}
            onLoadStart={() => setWebLoading(true)}
            onLoadEnd={() => setWebLoading(false)}
            startInLoadingState
            style={{ flex: 1, backgroundColor: '#FBF8F0' }}
          />
          {webLoading && (
            <View className="absolute inset-0 items-center justify-center bg-cream-50">
              <ActivityIndicator color="#1E1B4B" />
              <Text className="mt-3 text-xs text-slate-500">Sayfalar yükleniyor…</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}
