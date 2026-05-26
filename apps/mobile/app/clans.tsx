import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../src/components/ui/Icon'
import { apiFetch } from '../src/lib/api'

const EMOJIS = [
  '🦁',
  '🐺',
  '🦅',
  '🐉',
  '🦊',
  '🐻',
  '🦋',
  '⚔️',
  '🛡️',
  '🎯',
  '🔥',
  '⚡',
  '🌙',
  '☀️',
  '🌊',
]

export default function ClansScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState<'mine' | 'discover'>('mine')

  const { data: mine } = useQuery({
    queryKey: ['my-clans'],
    queryFn: () => apiFetch<{ memberships: any[] }>('/api/clans'),
  })

  const { data: discover } = useQuery({
    queryKey: ['discover-clans'],
    queryFn: () => apiFetch<{ clans: any[] }>('/api/clans/discover'),
    enabled: tab === 'discover',
  })

  // Create form
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🦁')

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<{ clan: any }>('/api/clans', {
        method: 'POST',
        body: JSON.stringify({ name, slug, description, emoji, isPublic: true }),
      }),
    onSuccess: (res) => {
      setCreateOpen(false)
      setName('')
      setSlug('')
      setDescription('')
      qc.invalidateQueries({ queryKey: ['my-clans'] })
      router.push(`/clan/${res.clan.slug}`)
    },
    onError: (e: any) => {
      if (e.message?.includes('max_founded')) {
        Alert.alert('Limit', 'Free üyeler 1 klan kurabilir. Pro üyeler 5.')
      } else if (e.message?.includes('slug_taken')) {
        Alert.alert('URL Alındı', 'Bu URL başkası tarafından kullanılıyor.')
      } else {
        Alert.alert('Hata', e.message)
      }
    },
  })

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-left" size={20} color="#1E1B4B" />
        </Pressable>
        <Pressable
          onPress={() => setCreateOpen(true)}
          className="bg-amber-500 rounded-full px-3 py-1.5 flex-row items-center gap-1"
        >
          <Icon name="plus" size={12} color="#1E1B4B" />
          <Text className="text-[11px] text-ink-900 font-bold">Klan Kur</Text>
        </Pressable>
      </View>

      <View className="px-5 mb-3">
        <Text className="font-serif text-3xl text-ink-900">Klanlar</Text>
        <Text className="text-sm text-slate-600 mt-1">
          10 kişilik çalışma grupları. Birlikte streak yap, birbirini motive et.
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-5 mb-3 gap-2">
        <Pressable
          onPress={() => setTab('mine')}
          className={`flex-1 py-2.5 rounded-full ${tab === 'mine' ? 'bg-ink-900' : 'bg-white border border-slate-200'}`}
        >
          <Text
            className={`text-center text-xs font-bold ${tab === 'mine' ? 'text-cream-50' : 'text-slate-600'}`}
          >
            Klanlarım ({mine?.memberships?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('discover')}
          className={`flex-1 py-2.5 rounded-full ${tab === 'discover' ? 'bg-ink-900' : 'bg-white border border-slate-200'}`}
        >
          <Text
            className={`text-center text-xs font-bold ${tab === 'discover' ? 'text-cream-50' : 'text-slate-600'}`}
          >
            Keşfet
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {tab === 'mine' && (
          <>
            {(mine?.memberships ?? []).map((m: any) => (
              <Pressable
                key={m.clan_id}
                onPress={() => router.push(`/clan/${m.clans.slug}`)}
                className="bg-white border border-slate-100 rounded-3xl p-4 mb-3 flex-row items-center gap-3"
                style={{ borderLeftColor: m.clans.color, borderLeftWidth: 4 }}
              >
                <Text className="text-3xl">{m.clans.emoji}</Text>
                <View className="flex-1">
                  <Text className="font-serif text-lg text-ink-900">{m.clans.name}</Text>
                  {m.clans.description && (
                    <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                      {m.clans.description}
                    </Text>
                  )}
                  <View className="flex-row items-center gap-3 mt-1.5">
                    <Text className="text-[10px] text-slate-500 font-mono">
                      {m.clans.member_count}/{m.clans.max_members} üye
                    </Text>
                    {m.role === 'founder' && (
                      <Text className="text-[10px] text-amber-600 font-bold">KURUCU</Text>
                    )}
                  </View>
                </View>
                <Icon name="chevron-right" size={16} color="#94A3B8" />
              </Pressable>
            ))}

            {(mine?.memberships ?? []).length === 0 && (
              <View className="items-center py-12">
                <Text className="text-4xl mb-3">⚔️</Text>
                <Text className="font-serif text-xl text-ink-900">Henüz klanın yok</Text>
                <Text className="text-sm text-slate-500 mt-1 text-center">
                  Bir klana katıl veya kendi klanını kur.
                </Text>
              </View>
            )}
          </>
        )}

        {tab === 'discover' && (
          <>
            {(discover?.clans ?? []).map((c: any) => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/clan/${c.slug}`)}
                className="bg-white border border-slate-100 rounded-3xl p-4 mb-3 flex-row items-center gap-3"
                style={{ borderLeftColor: c.color, borderLeftWidth: 4 }}
              >
                <Text className="text-3xl">{c.emoji}</Text>
                <View className="flex-1">
                  <Text className="font-serif text-lg text-ink-900">{c.name}</Text>
                  {c.description && (
                    <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                      {c.description}
                    </Text>
                  )}
                  <Text className="text-[10px] text-slate-500 font-mono mt-1">
                    {c.member_count}/{c.max_members} üye
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      {/* Create modal */}
      <Modal
        animationType="slide"
        transparent
        visible={createOpen}
        onRequestClose={() => setCreateOpen(false)}
      >
        <Pressable onPress={() => setCreateOpen(false)} className="flex-1 bg-black/40 justify-end">
          <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8 max-h-[85%]">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text className="font-serif text-2xl text-ink-900 mb-4">Yeni Klan</Text>

              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                Emoji
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ gap: 6 }}
              >
                {EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center border-2 ${
                      emoji === e ? 'bg-amber-500 border-amber-600' : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text className="text-xl">{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                İsim
              </Text>
              <TextInput
                placeholder="Yeditepe Çalışkanları"
                value={name}
                onChangeText={setName}
                maxLength={40}
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base mb-3"
              />

              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                URL (slug)
              </Text>
              <TextInput
                placeholder="yeditepe-calisanlari"
                value={slug}
                onChangeText={(t) => setSlug(t.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                autoCapitalize="none"
                maxLength={30}
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base mb-1"
              />
              <Text className="text-[10px] text-slate-400 mb-3">
                kavra.app/clan/{slug || 'slug'}
              </Text>

              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                Açıklama
              </Text>
              <TextInput
                placeholder="Kısaca klanınız ne hakkında?"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base"
                style={{ height: 80, textAlignVertical: 'top' }}
              />

              <Pressable
                onPress={() => createMut.mutate()}
                disabled={createMut.isPending || !name || !slug}
                className={`rounded-full py-3 mt-5 items-center ${
                  name && slug ? 'bg-ink-900' : 'bg-slate-200'
                }`}
              >
                {createMut.isPending ? (
                  <ActivityIndicator color="#F59E0B" />
                ) : (
                  <Text
                    className={`font-semibold ${name && slug ? 'text-cream-50' : 'text-slate-500'}`}
                  >
                    Klanı Kur
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
