import * as DocumentPicker from 'expo-document-picker'
import { Stack, useRouter } from 'expo-router'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { type Document, useDocuments, useUploadDocument } from '../../src/hooks/useDocuments'

const STATUS_META: Record<Document['status'], { emoji: string; label: string; color: string }> = {
  processing: { emoji: '⏳', label: 'İşleniyor', color: 'text-amber-600' },
  ready: { emoji: '✓', label: 'Hazır', color: 'text-green-600' },
  failed: { emoji: '✗', label: 'Başarısız', color: 'text-red-600' },
}

export default function DocumentsList() {
  const router = useRouter()
  const { data: docs, isLoading, refetch } = useDocuments()
  const upload = useUploadDocument()

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
    })

    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]

    if ((asset.size ?? 0) > 50 * 1024 * 1024) {
      Alert.alert('', "PDF 50 MB'tan büyük olamaz")
      return
    }

    upload.mutate(
      {
        uri: asset.uri,
        filename: asset.name,
        mimeType: asset.mimeType ?? 'application/pdf',
        sizeBytes: asset.size ?? 0,
      },
      {
        onSuccess: (doc) => router.push(`/documents/${doc.id}`),
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Dokümanlar',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
          <Text className="text-brand-900 font-semibold mb-1">📄 PDF Yükle</Text>
          <Text className="text-brand-800 text-sm leading-5">
            Ders notlarını, makale ya da kitap bölümünü yükle. Kavra otomatik kavram ve flashcard
            çıkarsın.
          </Text>
        </View>

        <Button
          title={upload.isPending ? 'Yükleniyor...' : '+ PDF Yükle'}
          onPress={pickAndUpload}
          loading={upload.isPending}
          fullWidth
        />

        <View className="mt-6">
          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#1E1B4B" />
            </View>
          ) : !docs || docs.length === 0 ? (
            <View className="py-12 items-center">
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text className="text-slate-500 text-center mt-3">
                Henüz doküman yok.{'\n'}İlk PDF'ini yükle.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {docs.map((d) => (
                <DocCard key={d.id} doc={d} onPress={() => router.push(`/documents/${d.id}`)} />
              ))}
            </View>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}

function DocCard({ doc, onPress }: { doc: Document; onPress: () => void }) {
  const meta = STATUS_META[doc.status]
  const sizeMB = doc.size_bytes ? (doc.size_bytes / 1024 / 1024).toFixed(1) : '?'

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 border border-slate-100 active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-xl bg-brand-50 items-center justify-center">
          <Text style={{ fontSize: 24 }}>📄</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-brand-950" numberOfLines={1}>
            {doc.filename}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text className={`text-xs font-medium ${meta.color}`}>
              {meta.emoji} {meta.label}
            </Text>
            <Text className="text-xs text-slate-500">·</Text>
            <Text className="text-xs text-slate-500">{doc.page_count ?? '?'} sayfa</Text>
            <Text className="text-xs text-slate-500">·</Text>
            <Text className="text-xs text-slate-500">{sizeMB} MB</Text>
          </View>
        </View>
        <Text className="text-slate-400 text-xl">›</Text>
      </View>

      {doc.status === 'failed' && doc.error_message && (
        <Text className="text-xs text-red-600 mt-2">{doc.error_message}</Text>
      )}
    </Pressable>
  )
}
