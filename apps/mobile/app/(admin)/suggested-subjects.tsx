import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Button } from '../../src/components/ui/Button'
import { Icon, type IconName } from '../../src/components/ui/Icon'
import { Input } from '../../src/components/ui/Input'
import { apiFetch } from '../../src/lib/api'
import { supabase } from '../../src/lib/supabase'

const COLOR_PALETTE = [
  '#1E1B4B',
  '#7C3AED',
  '#059669',
  '#0891B2',
  '#B4452D',
  '#CA8A04',
  '#0F172A',
  '#DB2777',
  '#92400E',
  '#0E7490',
  '#7C2D12',
  '#1E40AF',
]
const ICON_OPTIONS: IconName[] = [
  'languages',
  'calculator',
  'flask-conical',
  'dna',
  'atom',
  'scroll',
  'book-text',
  'globe',
  'lightbulb',
  'code',
  'palette',
  'music',
  'sparkles',
  'building',
  'microscope',
  'telescope',
]
const CATEGORIES = ['language', 'science', 'humanities', 'tech', 'art', 'other']

export default function AdminSuggestedSubjects() {
  const [creatorOpen, setCreatorOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-suggested-subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('suggested_subjects').select('*').order('display_order')
      return data ?? []
    },
  })

  return (
    <View className="flex-1 bg-cream-50">
      <View className="px-5 py-3 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <Text className="text-sm text-slate-600">{data?.length ?? 0} öneri</Text>
        <Pressable
          onPress={() => setCreatorOpen(true)}
          className="bg-ink-900 rounded-full px-4 py-2 flex-row items-center gap-1.5"
        >
          <Icon name="plus" size={14} color="#F59E0B" />
          <Text className="text-cream-50 text-xs font-bold">Yeni Öneri</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E1B4B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text className="text-xs text-slate-500 mb-3 leading-5">
            Bu konular onboarding\'de ve "Yeni Konu" modalında "Önerilen" sekmesinde görünür.
            Featured olanlar üstte popüler grid\'de yer alır.
          </Text>

          {(data ?? []).map((s: any) => (
            <View
              key={s.id}
              className="bg-white border border-slate-100 rounded-2xl p-3 mb-2 flex-row items-center gap-3"
            >
              <View
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${s.color}20` }}
              >
                {s.emoji ? (
                  <Text style={{ fontSize: 24 }}>{s.emoji}</Text>
                ) : (
                  <Icon name={(s.icon_name ?? 'book-open') as IconName} size={22} color={s.color} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-semibold text-ink-900 text-sm">{s.name}</Text>
                  {s.is_featured && (
                    <View className="bg-amber-500 px-1.5 py-0.5 rounded">
                      <Text className="text-[8px] font-bold text-ink-900">⭐ POPÜLER</Text>
                    </View>
                  )}
                </View>
                {s.description && (
                  <Text className="text-xs text-slate-500 mt-0.5">{s.description}</Text>
                )}
                <Text className="text-[10px] text-slate-400 mt-1">{s.category}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <CreatorModal
        visible={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ['admin-suggested-subjects'] })}
      />
    </View>
  )
}

function CreatorModal({
  visible,
  onClose,
  onCreated,
}: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('')
  const [iconName, setIconName] = useState<IconName>('book-open')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [category, setCategory] = useState('science')
  const [isFeatured, setIsFeatured] = useState(false)
  const [useEmoji, setUseEmoji] = useState(false)

  const create = useMutation({
    mutationFn: async () =>
      apiFetch('/api/admin/suggested-subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          emoji: useEmoji ? emoji || undefined : undefined,
          iconName: useEmoji ? undefined : iconName,
          color,
          category,
          isFeatured,
        }),
      }),
    onSuccess: () => {
      onCreated()
      setName('')
      setDescription('')
      setEmoji('')
      setIsFeatured(false)
      onClose()
    },
    onError: (e: any) => Alert.alert('Hata', e.message),
  })

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-cream-50 rounded-t-3xl pt-4 pb-8" style={{ maxHeight: '90%' }}>
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-3" />
            <View className="flex-row items-center justify-between px-6 mb-4">
              <Text className="font-serif text-2xl text-ink-900">
                Yeni <Text className="text-amber-500 italic">öneri</Text>
              </Text>
              <Pressable onPress={onClose}>
                <Icon name="x" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
              <Input label="İSİM" value={name} onChangeText={setName} placeholder="Almanca A2" />
              <View className="mt-3">
                <Input
                  label="AÇIKLAMA"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Goethe sertifikası"
                />
              </View>

              <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mt-4 mb-2">
                KATEGORİ
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full ${category === c ? 'bg-ink-900' : 'bg-slate-100'}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${category === c ? 'text-cream-50' : 'text-slate-600'}`}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="flex-row mt-3 mb-2 bg-slate-100 rounded-xl p-1">
                <Pressable
                  onPress={() => setUseEmoji(false)}
                  className={`flex-1 py-2 rounded-lg ${!useEmoji ? 'bg-white' : ''}`}
                >
                  <Text
                    className={`text-center text-xs font-semibold ${!useEmoji ? 'text-ink-900' : 'text-slate-500'}`}
                  >
                    İkon
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setUseEmoji(true)}
                  className={`flex-1 py-2 rounded-lg ${useEmoji ? 'bg-white' : ''}`}
                >
                  <Text
                    className={`text-center text-xs font-semibold ${useEmoji ? 'text-ink-900' : 'text-slate-500'}`}
                  >
                    Emoji
                  </Text>
                </Pressable>
              </View>

              {!useEmoji ? (
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {ICON_OPTIONS.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setIconName(n)}
                      className={`p-3 rounded-xl border ${iconName === n ? 'bg-ink-50 border-ink-900' : 'bg-white border-slate-200'}`}
                    >
                      <Icon name={n} size={20} color={iconName === n ? color : '#64748B'} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  value={emoji}
                  onChangeText={(v) => setEmoji(v.slice(0, 2))}
                  placeholder="🇩🇪"
                  className="bg-white border border-slate-200 rounded-xl text-center text-3xl mb-3"
                  style={{ height: 56 }}
                />
              )}

              <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
                RENK
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {COLOR_PALETTE.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Icon name="check" size={14} color="white" />}
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setIsFeatured(!isFeatured)}
                className={`p-3 rounded-xl border flex-row items-center gap-2 mb-4 ${isFeatured ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}
              >
                <Icon
                  name={isFeatured ? 'check-circle' : 'star'}
                  size={18}
                  color={isFeatured ? '#F59E0B' : '#94A3B8'}
                />
                <Text className="text-sm text-ink-900">⭐ Popüler grid'de göster</Text>
              </Pressable>

              <Button
                title="Öneri Ekle"
                onPress={() => create.mutate()}
                loading={create.isPending}
                disabled={!name.trim()}
                fullWidth
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
