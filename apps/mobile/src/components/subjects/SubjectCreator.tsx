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
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'
import { Input } from '../ui/Input'

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
  '#9333EA',
  '#475569',
  '#15803D',
]

const ICON_OPTIONS: Array<{ name: IconName; label: string }> = [
  { name: 'languages', label: 'Dil' },
  { name: 'calculator', label: 'Matematik' },
  { name: 'flask-conical', label: 'Kimya' },
  { name: 'dna', label: 'Biyoloji' },
  { name: 'atom', label: 'Fizik' },
  { name: 'scroll', label: 'Tarih' },
  { name: 'book-text', label: 'Edebiyat' },
  { name: 'globe', label: 'Coğrafya' },
  { name: 'lightbulb', label: 'Felsefe' },
  { name: 'code', label: 'Yazılım' },
  { name: 'bar-chart', label: 'Veri' },
  { name: 'palette', label: 'Sanat' },
  { name: 'music', label: 'Müzik' },
  { name: 'sparkles', label: 'Diğer' },
  { name: 'building', label: 'Mimari' },
  { name: 'microscope', label: 'Bilim' },
]

interface Props {
  visible: boolean
  onClose: () => void
  onCreated?: (subjectId: string) => void
}

interface SuggestedSubject {
  id: string
  name: string
  description: string | null
  emoji: string | null
  icon_name: string | null
  color: string
  category: string
  is_featured: boolean
}

/**
 * SubjectCreator
 * ===============
 *
 * 2 sekmeli modal:
 *   1. "Önerilen" — admin'in tanımladığı 15+ konu, tek tıkla ekle
 *   2. "Kendim Eklerim" — isim/ikon/renk seç, custom konu yarat
 */
export function SubjectCreator({ visible, onClose, onCreated }: Props) {
  const [tab, setTab] = useState<'suggested' | 'custom'>('suggested')

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-cream-50 rounded-t-3xl pt-4" style={{ maxHeight: '92%' }}>
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-3" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 mb-4">
              <Text className="font-serif text-2xl text-ink-900">
                Yeni <Text className="text-amber-500 italic">konu</Text>
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Icon name="x" size={24} color="#64748B" />
              </Pressable>
            </View>

            {/* Tabs */}
            <View className="flex-row mx-6 mb-2 bg-slate-100 rounded-xl p-1">
              <Pressable
                onPress={() => setTab('suggested')}
                className={`flex-1 py-2 rounded-lg ${tab === 'suggested' ? 'bg-white' : ''}`}
              >
                <Text
                  className={`text-center text-xs font-semibold ${tab === 'suggested' ? 'text-ink-900' : 'text-slate-500'}`}
                >
                  Önerilen
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab('custom')}
                className={`flex-1 py-2 rounded-lg ${tab === 'custom' ? 'bg-white' : ''}`}
              >
                <Text
                  className={`text-center text-xs font-semibold ${tab === 'custom' ? 'text-ink-900' : 'text-slate-500'}`}
                >
                  Kendim eklerim
                </Text>
              </Pressable>
            </View>

            {tab === 'suggested' ? (
              <SuggestedTab
                onCreated={(id) => {
                  onCreated?.(id)
                  onClose()
                }}
              />
            ) : (
              <CustomTab
                onCreated={(id) => {
                  onCreated?.(id)
                  onClose()
                }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ===== SUGGESTED TAB =====

function SuggestedTab({ onCreated }: { onCreated: (id: string) => void }) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState<string | null>(null)

  const { data: suggested, isLoading } = useQuery({
    queryKey: ['suggested-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suggested_subjects')
        .select('*')
        .order('display_order')
      if (error) throw error
      return data as SuggestedSubject[]
    },
  })

  const handleCreate = async (s: SuggestedSubject) => {
    setCreating(s.id)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: userData.user.id,
          name: s.name,
          description: s.description,
          color: s.color,
          emoji: s.emoji,
          custom_icon_name: s.icon_name,
          is_custom: false,
        })
        .select()
        .single()

      if (error) throw error
      qc.invalidateQueries({ queryKey: ['subjects'] })
      onCreated(data.id)
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setCreating(null)
    }
  }

  if (isLoading) {
    return (
      <View className="p-8 items-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  const featured = suggested?.filter((s) => s.is_featured) ?? []
  const others = suggested?.filter((s) => !s.is_featured) ?? []

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
      {featured.length > 0 && (
        <>
          <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2 mt-3">
            Popüler
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {featured.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => handleCreate(s)}
                disabled={creating !== null}
                className="bg-white border border-slate-100 rounded-2xl p-3 flex-row items-center gap-2"
                style={{
                  width: '48.5%',
                  borderColor: creating === s.id ? s.color : undefined,
                  borderWidth: creating === s.id ? 2 : 1,
                }}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${s.color}20` }}
                >
                  {s.emoji ? (
                    <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                  ) : s.icon_name ? (
                    <Icon name={s.icon_name as IconName} size={20} color={s.color} />
                  ) : (
                    <Icon name="book-open" size={20} color={s.color} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-ink-900 text-xs" numberOfLines={1}>
                    {s.name}
                  </Text>
                  {s.description && (
                    <Text className="text-[10px] text-slate-500" numberOfLines={1}>
                      {s.description}
                    </Text>
                  )}
                </View>
                {creating === s.id && <ActivityIndicator size="small" color={s.color} />}
              </Pressable>
            ))}
          </View>
        </>
      )}

      {others.length > 0 && (
        <>
          <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
            Daha fazla
          </Text>
          <View className="gap-2">
            {others.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => handleCreate(s)}
                disabled={creating !== null}
                className="bg-white border border-slate-100 rounded-xl p-3 flex-row items-center gap-3"
              >
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center"
                  style={{ backgroundColor: `${s.color}20` }}
                >
                  {s.emoji ? (
                    <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
                  ) : (
                    <Icon
                      name={(s.icon_name ?? 'book-open') as IconName}
                      size={18}
                      color={s.color}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-ink-900 text-sm">{s.name}</Text>
                  {s.description && <Text className="text-xs text-slate-500">{s.description}</Text>}
                </View>
                <Icon name="plus" size={18} color="#94A3B8" />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

// ===== CUSTOM TAB =====

function CustomTab({ onCreated }: { onCreated: (id: string) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('')
  const [iconName, setIconName] = useState<IconName>('book-open')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [useEmoji, setUseEmoji] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('İsim gerekli')

    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: userData.user.id,
          name: name.trim(),
          description: description.trim() || null,
          color,
          emoji: useEmoji ? emoji || null : null,
          custom_icon_name: useEmoji ? null : iconName,
          is_custom: true,
        })
        .select()
        .single()

      if (error) throw error
      qc.invalidateQueries({ queryKey: ['subjects'] })
      onCreated(data.id)
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
      {/* Preview */}
      <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          {useEmoji ? (
            <Text style={{ fontSize: 28 }}>{emoji || '📚'}</Text>
          ) : (
            <Icon name={iconName} size={28} color={color} />
          )}
        </View>
        <View className="flex-1">
          <Text className="font-serif text-lg text-ink-900">{name || 'Konunun ismi'}</Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {description || 'Kısa açıklama'}
          </Text>
        </View>
      </View>

      <Input
        label="İSİM"
        value={name}
        onChangeText={setName}
        placeholder="Örn: Almanca A2, YDS 2026..."
      />

      <View className="mt-3">
        <Input
          label="AÇIKLAMA (OPS.)"
          value={description}
          onChangeText={setDescription}
          placeholder="Hedefin nedir?"
        />
      </View>

      {/* Icon vs Emoji toggle */}
      <View className="flex-row mx-0 mt-4 mb-3 bg-slate-100 rounded-xl p-1">
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
        <View>
          <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
            İKON
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {ICON_OPTIONS.map((opt) => (
              <Pressable
                key={opt.name}
                onPress={() => setIconName(opt.name)}
                className={`p-3 rounded-xl border ${iconName === opt.name ? 'bg-ink-900' : 'bg-white border-slate-200'}`}
                style={{ borderColor: iconName === opt.name ? color : undefined }}
              >
                <Icon name={opt.name} size={22} color={iconName === opt.name ? color : '#64748B'} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View>
          <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
            EMOJİ
          </Text>
          <TextInput
            value={emoji}
            onChangeText={(v) => setEmoji(v.slice(0, 2))}
            placeholder="🇩🇪"
            className="bg-white border border-slate-200 rounded-xl p-3 text-3xl text-center"
            style={{ height: 64 }}
            maxLength={2}
          />
          <Text className="text-[10px] text-slate-400 text-center mt-1">
            iOS/Android emoji klavyesini aç (🌐 tuşu) ve seç
          </Text>
        </View>
      )}

      {/* Color */}
      <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2 mt-2">
        RENK
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
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

      <View className="mt-2">
        <Button
          title="Konuyu Oluştur"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim()}
          fullWidth
        />
      </View>
    </ScrollView>
  )
}
