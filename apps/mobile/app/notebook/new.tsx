import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { useCreateNotebook } from '../../src/hooks/useNotebooks'

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

const LANGS = [
  { code: 'tr', label: '🇹🇷 Türkçe' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
]

export default function NewNotebook() {
  const router = useRouter()
  const create = useCreateNotebook()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📓')
  const [color, setColor] = useState('#1E1B4B')
  const [language, setLanguage] = useState('tr')

  const submit = async () => {
    if (!title.trim()) return Alert.alert('Başlık gerekli')

    try {
      const res = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        emoji,
        color,
        language,
      })
      router.replace(`/notebook/${res.notebook.id}`)
    } catch (e: any) {
      if (e.message?.includes('free_limit')) {
        Alert.alert('Limit', "Free üyeler 3 aktif defter tutabilir. Pro'ya geçince sınırsız.", [
          { text: 'Tamam', style: 'cancel' },
          { text: "Pro'ya Geç", onPress: () => router.replace('/upgrade') },
        ])
      } else {
        Alert.alert('Hata', e.message)
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: 'Yeni Defter',
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 18 },
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Preview */}
        <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-5 flex-row items-center gap-3">
          <View
            className="w-14 h-14 rounded-2xl items-center justify-center"
            style={{ backgroundColor: `${color}22` }}
          >
            <Text style={{ fontSize: 28 }}>{emoji}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-serif text-lg text-ink-900" numberOfLines={1}>
              {title || 'Defter başlığı'}
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
              {description || 'Kısa açıklama'}
            </Text>
          </View>
        </View>

        <Input
          label="DEFTER BAŞLIĞI"
          value={title}
          onChangeText={setTitle}
          placeholder="Hücre Biyolojisi"
          autoFocus
        />

        <View className="mt-3">
          <Input
            label="AÇIKLAMA (OPS.)"
            value={description}
            onChangeText={setDescription}
            placeholder="Final sınavı için"
          />
        </View>

        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-5 mb-2">
          Emoji
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              className={`w-12 h-12 rounded-xl items-center justify-center border-2 ${
                emoji === e ? 'border-ink-900 bg-amber-50' : 'border-slate-200 bg-white'
              }`}
            >
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-5 mb-2">
          Renk
        </Text>
        <View className="flex-row flex-wrap gap-2">
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

        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-5 mb-2">
          Defter Dili
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {LANGS.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              className={`px-3 py-2 rounded-xl border ${
                language === l.code ? 'bg-ink-900 border-ink-900' : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${language === l.code ? 'text-cream-50' : 'text-slate-700'}`}
              >
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-8">
          <Button
            title="Defteri Oluştur"
            onPress={submit}
            loading={create.isPending}
            disabled={!title.trim() || create.isPending}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
