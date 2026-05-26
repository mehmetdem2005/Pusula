import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native'
import { apiFetch } from '../../lib/api'
import { Icon } from '../ui/Icon'

const CATEGORIES = [
  { value: 'biology', emoji: '🧬', label: 'Biyoloji' },
  { value: 'chemistry', emoji: '⚗️', label: 'Kimya' },
  { value: 'physics', emoji: '⚛️', label: 'Fizik' },
  { value: 'history', emoji: '🏛️', label: 'Tarih' },
  { value: 'literature', emoji: '📖', label: 'Edebiyat' },
  { value: 'turkish', emoji: '🇹🇷', label: 'Türkçe' },
  { value: 'language', emoji: '🌍', label: 'Yabancı Dil' },
  { value: 'math', emoji: '∑', label: 'Matematik' },
  { value: 'cs', emoji: '💻', label: 'Bilgisayar' },
  { value: 'philosophy', emoji: '🤔', label: 'Felsefe' },
  { value: 'art', emoji: '🎨', label: 'Sanat' },
]

interface Props {
  visible: boolean
  onClose: () => void
  notebook: {
    id: string
    is_public: boolean
    public_slug: string | null
    category: string | null
    allow_clone: boolean
    title: string
  }
}

export function ShareNotebookModal({ visible, onClose, notebook }: Props) {
  const qc = useQueryClient()
  const [isPublic, setIsPublic] = useState(notebook.is_public)
  const [category, setCategory] = useState(notebook.category)
  const [allowClone, setAllowClone] = useState(notebook.allow_clone)

  const shareMut = useMutation({
    mutationFn: () =>
      apiFetch<{ shareUrl: string | null; notebook: any }>(`/api/notebooks/${notebook.id}/share`, {
        method: 'POST',
        body: JSON.stringify({ isPublic, category, allowClone }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notebook', notebook.id] })
      if (res.shareUrl) {
        Alert.alert('✓ Paylaşıldı', `Defter herkese açık.\n\n${res.shareUrl}`, [
          {
            text: 'Linki Kopyala',
            onPress: async () => {
              await Clipboard.setStringAsync(res.shareUrl!)
            },
          },
          {
            text: 'Paylaş',
            onPress: () =>
              Share.share({ message: `${notebook.title}\n${res.shareUrl}`, url: res.shareUrl! }),
          },
          { text: 'Tamam', style: 'cancel', onPress: onClose },
        ])
      } else {
        onClose()
      }
    },
    onError: (e: any) => Alert.alert('Hata', e.message),
  })

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8 max-h-[90%]">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Text className="font-serif text-2xl text-ink-900">Paylaş</Text>
            <Text className="text-sm text-slate-600 mt-1 mb-5">
              Bu defteri herkese açık yaparsan kavra.app/n/... linkinden erişilir. Kaynak içerikleri
              gizli kalır — sadece başlıklar ve metadata görünür.
            </Text>

            {/* Public toggle */}
            <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-semibold text-ink-900">Herkese Açık</Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Galeride görünür, link paylaşılabilir.
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
                thumbColor={isPublic ? '#1E1B4B' : '#F1F5F9'}
              />
            </View>

            {isPublic && (
              <>
                {/* Allow clone */}
                <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-ink-900">Klonlamaya İzin Ver</Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      Pro üyeler defteri kendi kütüphanelerine kopyalayabilir.
                    </Text>
                  </View>
                  <Switch
                    value={allowClone}
                    onValueChange={setAllowClone}
                    trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
                    thumbColor={allowClone ? '#1E1B4B' : '#F1F5F9'}
                  />
                </View>

                {/* Category */}
                <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2 mt-2">
                  Kategori (galeri için)
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c.value}
                      onPress={() => setCategory(category === c.value ? null : c.value)}
                      className={`px-2.5 py-1.5 rounded-full border flex-row items-center gap-1 ${
                        category === c.value
                          ? 'bg-amber-500 border-amber-500'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text className="text-xs">{c.emoji}</Text>
                      <Text
                        className={`text-[11px] font-semibold ${category === c.value ? 'text-ink-900' : 'text-slate-600'}`}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 flex-row gap-2">
                  <Icon name="info" size={14} color="#F59E0B" />
                  <Text className="flex-1 text-[11px] text-amber-900 leading-5">
                    Paylaştığında "Paylaşan El" rozetini kazanırsın. 100 görüntüleme = "Viral"
                    rozet.
                  </Text>
                </View>
              </>
            )}

            <Pressable
              onPress={() => shareMut.mutate()}
              disabled={shareMut.isPending}
              className="bg-ink-900 rounded-full py-3 items-center mt-2"
            >
              <Text className="text-cream-50 font-semibold">
                {shareMut.isPending ? 'Kaydediliyor...' : isPublic ? 'Paylaş' : 'Gizle'}
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
