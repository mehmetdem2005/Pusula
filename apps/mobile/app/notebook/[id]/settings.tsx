import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../../src/components/ui/Icon'
import { useDeleteNotebook, useNotebook, useUpdateNotebook } from '../../../src/hooks/useNotebooks'

const EMOJIS = ['📓', '📚', '🧠', '🔬', '💡', '🎯', '🌍', '⚗️', '📐', '🎨', '💻', '📜', '🌱', '⚙️']
const COLORS = [
  { hex: '#1E1B4B', name: 'İndigo' },
  { hex: '#7C3AED', name: 'Mor' },
  { hex: '#0891B2', name: 'Camgöbeği' },
  { hex: '#10B981', name: 'Yeşil' },
  { hex: '#F59E0B', name: 'Kehribar' },
  { hex: '#EF4444', name: 'Kırmızı' },
  { hex: '#DB2777', name: 'Pembe' },
  { hex: '#64748B', name: 'Gri' },
]

export default function NotebookSettings() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = useNotebook(id ?? null)
  const update = useUpdateNotebook()
  const del = useDeleteNotebook()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📓')
  const [color, setColor] = useState('#1E1B4B')
  const [isPinned, setIsPinned] = useState(false)
  const [isArchived, setIsArchived] = useState(false)

  // Notebook yüklenince formu doldur
  useEffect(() => {
    const nb = data?.notebook
    if (!nb) return
    setTitle(nb.title)
    setDescription(nb.description ?? '')
    setEmoji(nb.emoji)
    setColor(nb.color)
    setIsPinned(nb.is_pinned)
    setIsArchived(nb.is_archived)
  }, [data?.notebook])

  const handleSave = async () => {
    if (!id || !title.trim()) {
      Alert.alert('Hata', 'Başlık boş olamaz.')
      return
    }
    try {
      await update.mutateAsync({
        id,
        updates: {
          title: title.trim(),
          description: description.trim(),
          emoji,
          color,
          is_pinned: isPinned,
          is_archived: isArchived,
        },
      })
      router.back()
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Kaydedilemedi')
    }
  }

  const handleDelete = () => {
    if (!id) return
    Alert.alert('Defteri sil', 'Bu defter ve tüm kaynakları kalıcı olarak silinecek. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(id)
            router.dismissAll?.()
            router.replace('/notebooks')
          } catch (e: any) {
            Alert.alert('Hata', e.message ?? 'Silinemedi')
          }
        },
      },
    ])
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  if (!data?.notebook) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center px-8">
        <Stack.Screen options={{ title: 'Ayarlar', headerStyle: { backgroundColor: '#FBF8F0' } }} />
        <Icon name="alert-circle" size={40} color="#94A3B8" />
        <Text className="mt-3 text-slate-700">Defter bulunamadı.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-ink-900 rounded-full px-5 py-2.5">
          <Text className="text-cream-50 font-semibold">Geri</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['bottom']}>
      <Stack.Screen
        options={{ title: 'Defter Ayarları', headerStyle: { backgroundColor: '#FBF8F0' } }}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 20 }}>
        {/* Önizleme */}
        <View className="items-center">
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center"
            style={{ backgroundColor: `${color}22` }}
          >
            <Text style={{ fontSize: 36 }}>{emoji}</Text>
          </View>
        </View>

        {/* Başlık */}
        <View>
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
            Başlık
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Defter başlığı"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-base text-ink-900"
          />
        </View>

        {/* Açıklama */}
        <View>
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
            Açıklama
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="İsteğe bağlı"
            placeholderTextColor="#94A3B8"
            multiline
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-base text-ink-900 min-h-[64px]"
            textAlignVertical="top"
          />
        </View>

        {/* Emoji */}
        <View>
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
            Simge
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                className={`w-12 h-12 rounded-xl items-center justify-center border ${
                  emoji === e ? 'border-ink-900 bg-amber-50' : 'border-slate-200 bg-white'
                }`}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Renk */}
        <View>
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
            Renk
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {COLORS.map((c) => (
              <Pressable
                key={c.hex}
                onPress={() => setColor(c.hex)}
                className={`w-10 h-10 rounded-full border-2 ${
                  color === c.hex ? 'border-ink-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </View>
        </View>

        {/* Toggle'lar */}
        <View className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100">
          <ToggleRow
            label="Sabitlenmiş"
            sub="Listenin üstünde tutulur"
            value={isPinned}
            onToggle={() => setIsPinned((v) => !v)}
          />
          <ToggleRow
            label="Arşivlenmiş"
            sub="Aktif listeden gizlenir"
            value={isArchived}
            onToggle={() => setIsArchived((v) => !v)}
          />
        </View>

        {/* Kaydet */}
        <Pressable
          onPress={handleSave}
          disabled={update.isPending}
          className="bg-ink-900 rounded-2xl py-4 items-center flex-row justify-center gap-2"
        >
          {update.isPending ? (
            <ActivityIndicator color="#F59E0B" />
          ) : (
            <>
              <Icon name="check" size={16} color="#F59E0B" />
              <Text className="text-cream-50 font-semibold">Kaydet</Text>
            </>
          )}
        </Pressable>

        {/* Sil */}
        <Pressable
          onPress={handleDelete}
          disabled={del.isPending}
          className="rounded-2xl py-4 items-center flex-row justify-center gap-2 border border-red-200 bg-red-50"
        >
          <Icon name="trash" size={16} color="#EF4444" />
          <Text className="text-red-600 font-semibold">Defteri Sil</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function ToggleRow({
  label,
  sub,
  value,
  onToggle,
}: {
  label: string
  sub: string
  value: boolean
  onToggle: () => void
}) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center justify-between px-4 py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-base text-ink-900">{label}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{sub}</Text>
      </View>
      <View
        className={`w-12 h-7 rounded-full px-0.5 justify-center ${
          value ? 'bg-emerald-500' : 'bg-slate-200'
        }`}
      >
        <View
          className="w-6 h-6 rounded-full bg-white"
          style={{ alignSelf: value ? 'flex-end' : 'flex-start' }}
        />
      </View>
    </Pressable>
  )
}
