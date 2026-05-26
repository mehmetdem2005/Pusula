import * as DocumentPicker from 'expo-document-picker'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../../src/components/ui/Button'
import { Icon } from '../../../src/components/ui/Icon'
import { Input } from '../../../src/components/ui/Input'
import { useUploadLibraryDocument } from '../../../src/hooks/useAdmin'

const CATEGORIES = [
  { v: 'textbook', l: 'Ders Kitabı', e: '📚' },
  { v: 'exam_prep', l: 'Sınav Hazırlık', e: '🎓' },
  { v: 'reference', l: 'Başvuru', e: '📖' },
  { v: 'novel', l: 'Roman', e: '📕' },
  { v: 'other', l: 'Diğer', e: '📄' },
] as const

export default function LibraryUpload() {
  const router = useRouter()
  const upload = useUploadLibraryDocument()

  const [file, setFile] = useState<{
    uri: string
    name: string
    size: number
    mimeType?: string
  } | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['v']>('textbook')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isProOnly, setIsProOnly] = useState(false)

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      })
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        setFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size ?? 0,
          mimeType: asset.mimeType,
        })
        if (!title) setTitle(asset.name.replace(/\.pdf$/i, ''))
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const handleUpload = async () => {
    if (!file) return Alert.alert('PDF seç')
    if (!title.trim()) return Alert.alert('Başlık gerekli')

    try {
      const fetchRes = await fetch(file.uri)
      const blob = await fetchRes.blob()

      await upload.mutateAsync({
        file: blob,
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        category,
        subjectTags: tags,
        isProOnly,
      })

      Alert.alert('✓ Yüklendi', 'Kitap kütüphaneye eklendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ])
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="font-serif text-2xl text-ink-900 mb-1">
          Yeni <Text className="text-amber-500 italic">kitap</Text>
        </Text>
        <Text className="text-sm text-slate-600 mb-5">
          PDF olarak yükle. Kullanıcılar bunu kütüphanede görüp indirebilir.
        </Text>

        {/* File picker */}
        <Pressable
          onPress={pickFile}
          className={`border-2 border-dashed rounded-2xl p-6 items-center mb-4 ${
            file ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-white'
          }`}
        >
          {file ? (
            <>
              <Icon name="check-circle" size={36} color="#10B981" />
              <Text className="font-semibold text-ink-900 mt-2 text-center" numberOfLines={2}>
                {file.name}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(1)} MB · değiştirmek için dokun
              </Text>
            </>
          ) : (
            <>
              <Icon name="upload" size={32} color="#94A3B8" />
              <Text className="font-semibold text-ink-900 mt-2">PDF seç</Text>
              <Text className="text-xs text-slate-500 mt-1">Galeri ya da Dosyalar'dan</Text>
            </>
          )}
        </Pressable>

        <Input
          label="BAŞLIK"
          value={title}
          onChangeText={setTitle}
          placeholder="Klett A2 Lehrbuch"
        />
        <View className="mt-3">
          <Input label="YAZAR (OPS.)" value={author} onChangeText={setAuthor} placeholder="" />
        </View>
        <View className="mt-3">
          <Input
            label="AÇIKLAMA (OPS.)"
            value={description}
            onChangeText={setDescription}
            placeholder="Kitabı kısaca tanıt"
            multiline
          />
        </View>

        {/* Category */}
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-4 mb-2">
          Kategori
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.v}
              onPress={() => setCategory(c.v)}
              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                category === c.v ? 'bg-ink-900 border-ink-900' : 'bg-white border-slate-200'
              }`}
            >
              <Text style={{ fontSize: 16 }}>{c.e}</Text>
              <Text
                className={`text-xs font-semibold ${category === c.v ? 'text-cream-50' : 'text-slate-700'}`}
              >
                {c.l}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tags */}
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-4 mb-2">
          Etiketler
        </Text>
        <View className="flex-row gap-2 mb-2">
          <View className="flex-1">
            <Input
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Almanca, A2..."
              onSubmitEditing={addTag}
            />
          </View>
          <Pressable onPress={addTag} className="bg-ink-900 rounded-xl px-4 justify-center">
            <Icon name="plus" size={18} color="#F59E0B" />
          </Pressable>
        </View>
        {tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTags(tags.filter((x) => x !== t))}
                className="bg-slate-100 px-2.5 py-1 rounded-full flex-row items-center gap-1"
              >
                <Text className="text-xs text-ink-900">#{t}</Text>
                <Icon name="x" size={10} color="#64748B" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Pro only */}
        <View className="bg-white border border-slate-100 rounded-xl p-3 flex-row items-center mt-4">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink-900">Sadece Pro</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Sadece Pro üyeler indirebilir</Text>
          </View>
          <Switch value={isProOnly} onValueChange={setIsProOnly} trackColor={{ true: '#1E1B4B' }} />
        </View>

        <View className="mt-6">
          <Button
            title={upload.isPending ? 'Yükleniyor...' : 'Kütüphaneye Ekle'}
            onPress={handleUpload}
            loading={upload.isPending}
            disabled={!file || !title.trim() || upload.isPending}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
