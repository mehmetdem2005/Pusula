import * as DocumentPicker from 'expo-document-picker'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Icon } from '../../src/components/ui/Icon'
import { Input } from '../../src/components/ui/Input'
import { useCreateBook, useUploadBook } from '../../src/hooks/useBooks'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'İngilizce' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'de', flag: '🇩🇪', name: 'Almanca' },
  { code: 'fr', flag: '🇫🇷', name: 'Fransızca' },
  { code: 'es', flag: '🇪🇸', name: 'İspanyolca' },
  { code: 'it', flag: '🇮🇹', name: 'İtalyanca' },
  { code: 'ja', flag: '🇯🇵', name: 'Japonca' },
  { code: 'ar', flag: '🇸🇦', name: 'Arapça' },
]

export default function LibraryAdd() {
  const router = useRouter()
  const upload = useUploadBook()
  const createBook = useCreateBook()

  const [file, setFile] = useState<{
    uri: string
    name: string
    size: number
    format: 'epub' | 'pdf' | 'txt'
  } | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [language, setLanguage] = useState('en')

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      })
      if (!res.canceled && res.assets[0]) {
        const a = res.assets[0]
        const ext = a.name.toLowerCase().split('.').pop() ?? ''
        const format: 'epub' | 'pdf' | 'txt' =
          ext === 'epub' ? 'epub' : ext === 'pdf' ? 'pdf' : 'txt'

        setFile({
          uri: a.uri,
          name: a.name,
          size: a.size ?? 0,
          format,
        })
        if (!title) setTitle(a.name.replace(/\.(epub|pdf|txt)$/i, ''))
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
  }

  const handleSubmit = async () => {
    if (!file) return Alert.alert('Dosya seç')
    if (!title.trim()) return Alert.alert('Başlık gerekli')

    try {
      const fileBlob = await (await fetch(file.uri)).blob()

      const uploaded = await upload.mutateAsync({
        file: fileBlob,
        fileName: file.name,
        format: file.format,
      })

      const book = await createBook.mutateAsync({
        title: title.trim(),
        author: author.trim() || undefined,
        language,
        format: file.format,
        storagePath: uploaded.storagePath,
      })

      Alert.alert('✓ Eklendi', 'Kitap kütüphanene eklendi.', [
        {
          text: 'Hemen Oku',
          onPress: () => router.replace(`/reader/${book.book.id}`),
        },
        { text: 'Kütüphaneye Dön', onPress: () => router.back() },
      ])
    } catch (e: any) {
      if (e.message?.includes('free_limit')) {
        Alert.alert(
          'Aylık limit doldu',
          "Free üyeler ayda 5 kitap yükleyebilir. Pro'ya geç sınırsız aç.",
          [
            { text: 'Tamam', style: 'cancel' },
            { text: "Pro'ya Geç", onPress: () => router.replace('/upgrade') },
          ],
        )
      } else {
        Alert.alert('Hata', e.message)
      }
    }
  }

  const isLoading = upload.isPending || createBook.isPending

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: 'Kitap Ekle',
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 18 },
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="font-serif text-3xl text-ink-900 mb-1">
          Yeni <Text className="text-amber-500 italic">kitap</Text>
        </Text>
        <Text className="text-sm text-slate-600 mb-6">
          EPUB tercih edilir (akıcı okuma). PDF de desteklenir.
        </Text>

        {/* File picker */}
        <Pressable
          onPress={pickFile}
          className={`border-2 border-dashed rounded-3xl p-6 items-center mb-5 ${
            file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'
          }`}
        >
          {file ? (
            <>
              <Icon name="check-circle" size={36} color="#10B981" />
              <Text className="font-semibold text-ink-900 mt-2 text-center" numberOfLines={2}>
                {file.name}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View className="bg-ink-900 rounded px-2 py-0.5">
                  <Text className="text-cream-50 text-[9px] font-bold">
                    {file.format.toUpperCase()}
                  </Text>
                </View>
                <Text className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
              <Text className="text-[10px] text-slate-500 mt-2">değiştirmek için dokun</Text>
            </>
          ) : (
            <>
              <Icon name="upload" size={32} color="#94A3B8" />
              <Text className="font-semibold text-ink-900 mt-2">Kitap seç</Text>
              <Text className="text-xs text-slate-500 mt-1 text-center">EPUB · PDF · TXT</Text>
            </>
          )}
        </Pressable>

        <Input
          label="BAŞLIK"
          value={title}
          onChangeText={setTitle}
          placeholder="Crime and Punishment"
        />
        <View className="mt-3">
          <Input
            label="YAZAR (OPS.)"
            value={author}
            onChangeText={setAuthor}
            placeholder="Fyodor Dostoevsky"
          />
        </View>

        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-5 mb-2">
          Kitabın Dili
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${
                language === l.code ? 'bg-ink-900 border-ink-900' : 'bg-white border-slate-200'
              }`}
            >
              <Text style={{ fontSize: 16 }}>{l.flag}</Text>
              <Text
                className={`text-xs font-semibold ${language === l.code ? 'text-cream-50' : 'text-slate-700'}`}
              >
                {l.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-5 flex-row gap-2">
          <Icon name="info" size={16} color="#F59E0B" />
          <Text className="flex-1 text-xs text-amber-900 leading-5">
            Free üyeler ayda 5 kitap yükleyebilir. Pro\'ya geçince sınırsız + AI çeviri açılır.
          </Text>
        </View>

        <View className="mt-6">
          <Button
            title={isLoading ? 'Yükleniyor...' : 'Kütüphaneme Ekle'}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!file || !title.trim() || isLoading}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
