import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import {
  type ExtractedConcept,
  useDocument,
  useExtractConcepts,
  useGenerateFlashcards,
} from '../../src/hooks/useDocuments'

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: doc, isLoading } = useDocument(id ?? null)
  const extract = useExtractConcepts()
  const generate = useGenerateFlashcards()

  const [extractedConcepts, setExtractedConcepts] = useState<ExtractedConcept[] | null>(null)

  const isReady = doc?.status === 'ready'
  const isFailed = doc?.status === 'failed'
  const isProcessing = doc?.status === 'processing'

  const handleExtract = async () => {
    if (!id) return
    extract.mutate(id, {
      onSuccess: (concepts) => {
        setExtractedConcepts(concepts)
      },
      onError: (e: any) => {
        if (e.message === 'no_subject') {
          Alert.alert(
            'Konu seç',
            'Bu doküman henüz bir konuya bağlanmamış. Önce konu eklemen gerekli.',
          )
        } else {
          Alert.alert('Hata', e.message)
        }
      },
    })
  }

  const handleGenerate = () => {
    if (!id) return
    generate.mutate(
      { documentId: id, maxPerChunk: 3 },
      {
        onSuccess: (r) => {
          Alert.alert(
            '🎉 Kartlar üretildi',
            `${r.generated} flashcard hazır. İncelemek ister misin?`,
            [
              { text: 'Sonra', style: 'cancel' },
              { text: 'İncele', onPress: () => router.push(`/documents/${id}/flashcards`) },
            ],
          )
        },
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  if (isLoading || !doc) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: doc.filename,
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Status kartı */}
        <View
          className={[
            'rounded-2xl p-4 border',
            isReady
              ? 'bg-green-50 border-green-200'
              : isFailed
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200',
          ].join(' ')}
        >
          {isProcessing && (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color="#D97706" />
              <View className="flex-1">
                <Text className="font-semibold text-amber-900">İşleniyor...</Text>
                <Text className="text-amber-800 text-sm mt-0.5">
                  PDF parse ediliyor, embedding oluşturuluyor.
                </Text>
              </View>
            </View>
          )}

          {isReady && (
            <View className="flex-row items-center gap-3">
              <Text style={{ fontSize: 24 }}>✅</Text>
              <View className="flex-1">
                <Text className="font-semibold text-green-900">Hazır</Text>
                <Text className="text-green-800 text-sm mt-0.5">
                  {doc.page_count} sayfa işlendi. Kavram çıkar veya flashcard üret.
                </Text>
              </View>
            </View>
          )}

          {isFailed && (
            <View>
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 24 }}>⚠️</Text>
                <Text className="font-semibold text-red-900">Hata</Text>
              </View>
              {doc.error_message && (
                <Text className="text-red-800 text-sm mt-2">{doc.error_message}</Text>
              )}
            </View>
          )}
        </View>

        {/* Eylemler */}
        {isReady && (
          <View className="mt-6 gap-3">
            <ActionCard
              emoji="🧠"
              title="Kavram Çıkar"
              subtitle="AI ana kavramları belirlesin"
              onPress={handleExtract}
              loading={extract.isPending}
            />
            <ActionCard
              emoji="🃏"
              title="Flashcard Üret"
              subtitle="Otomatik soru-cevap kartları"
              onPress={handleGenerate}
              loading={generate.isPending}
            />
            <ActionCard
              emoji="💬"
              title="PDF Hakkında Soru Sor"
              subtitle="RAG ile dokümandan cevap (yakında)"
              onPress={() => Alert.alert('', "RAG sohbet Faz 4'te")}
              disabled
            />
          </View>
        )}

        {/* Çıkarılan kavramlar */}
        {extractedConcepts && extractedConcepts.length > 0 && (
          <View className="mt-6">
            <Text className="text-lg font-serif text-brand-950 mb-3">Çıkarılan Kavramlar</Text>
            <View className="gap-2">
              {extractedConcepts.map((c, i) => (
                <View key={i} className="bg-white rounded-xl p-4 border border-slate-100">
                  <View className="flex-row items-start justify-between">
                    <Text className="font-semibold text-brand-950 flex-1">{c.name}</Text>
                    <View className="bg-brand-50 px-2 py-0.5 rounded">
                      <Text className="text-xs text-brand-700">⭐ {c.difficulty}/5</Text>
                    </View>
                  </View>
                  <Text className="text-slate-600 text-sm mt-1">{c.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}

function ActionCard({
  emoji,
  title,
  subtitle,
  onPress,
  loading,
  disabled,
}: {
  emoji: string
  title: string
  subtitle: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      className={[
        'bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center gap-4',
        disabled ? 'opacity-50' : 'active:opacity-70',
      ].join(' ')}
    >
      <View className="w-12 h-12 bg-brand-50 rounded-xl items-center justify-center">
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-brand-950">{title}</Text>
        <Text className="text-slate-500 text-sm">{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#1E1B4B" />
      ) : (
        <Text className="text-slate-400 text-xl">›</Text>
      )}
    </Pressable>
  )
}
