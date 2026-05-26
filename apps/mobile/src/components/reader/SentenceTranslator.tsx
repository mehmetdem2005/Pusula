import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useTranslateSentence } from '../../hooks/useDictionary'
import { useIsPro } from '../../hooks/useEntitlement'
import { Icon } from '../ui/Icon'

interface Props {
  text: string
  sourceLang: string
  targetLang: string
  onClose: () => void
  onTranslated?: () => void
}

/**
 * SentenceTranslator
 * ==================
 *
 * Linga'nın "ÇEVİRİ SEÇ" / "AI ÇEVİRİ" akışı:
 *  - Seçilen pasaj/cümle yukarıda
 *  - Çeviri (Gemini Flash, ücretsiz)
 *  - Edebi çeviri toggle (Pro - Claude Sonnet)
 *  - Alternatifler
 *  - Notlar (deyim, kayıt vb)
 */
export function SentenceTranslator({ text, sourceLang, targetLang, onClose, onTranslated }: Props) {
  const isPro = useIsPro()
  const translate = useTranslateSentence()
  const [literary, setLiterary] = useState(false)

  useEffect(() => {
    translate.mutate(
      { text, sourceLang, targetLang, literary },
      {
        onSuccess: () => onTranslated?.(),
      },
    )
  }, [literary])

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8" style={{ maxHeight: '80%' }}>
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-3" />

          {/* Header */}
          <View className="px-6 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="bg-amber-500 rounded-full w-7 h-7 items-center justify-center">
                <Icon name="sparkles" size={14} color="#1E1B4B" />
              </View>
              <Text className="font-mono text-[10px] text-amber-700 tracking-widest font-bold">
                AI ÇEVİRİ
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Icon name="x" size={24} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
            {/* Source text */}
            <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
              <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
                Orijinal
              </Text>
              <Text className="text-ink-900 text-base leading-6 font-serif italic">"{text}"</Text>
            </View>

            {/* Translation */}
            {translate.isPending ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#F59E0B" />
                <Text className="text-xs text-slate-500 mt-2">
                  {literary ? '✨ Edebi çeviri yapılıyor...' : 'Çeviriliyor...'}
                </Text>
              </View>
            ) : translate.data ? (
              <>
                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-mono text-[9px] text-amber-700 tracking-widest uppercase font-bold">
                      Türkçe
                    </Text>
                    {literary && (
                      <View className="bg-ink-900 rounded-full px-2 py-0.5">
                        <Text className="text-amber-500 text-[9px] font-bold">EDEBİ</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-ink-900 text-base leading-6">
                    {translate.data.translation}
                  </Text>
                </View>

                {/* Alternatives */}
                {translate.data.alternatives && translate.data.alternatives.length > 0 && (
                  <View className="mb-3">
                    <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
                      Alternatif Çeviriler
                    </Text>
                    {translate.data.alternatives.map((alt, i) => (
                      <View
                        key={i}
                        className="bg-white border border-slate-100 rounded-xl p-3 mb-2"
                      >
                        <Text className="text-ink-900 text-sm">{alt.translation}</Text>
                        {alt.note && (
                          <Text className="text-slate-500 text-xs mt-1 italic">→ {alt.note}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Notes */}
                {translate.data.notes && (
                  <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex-row gap-2">
                    <Icon name="lightbulb" size={16} color="#059669" />
                    <Text className="flex-1 text-emerald-900 text-xs leading-5">
                      {translate.data.notes}
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            {/* Literary toggle */}
            <View className="bg-white border border-slate-100 rounded-2xl p-4 mt-2">
              <Pressable
                onPress={() => {
                  if (!isPro && !literary) {
                    return
                  }
                  setLiterary(!literary)
                }}
                className="flex-row items-center gap-3"
              >
                <View
                  className={`w-12 h-7 rounded-full ${literary ? 'bg-ink-900' : 'bg-slate-200'} relative`}
                >
                  <View
                    className="absolute top-0.5 w-6 h-6 bg-white rounded-full"
                    style={{
                      left: literary ? 22 : 2,
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowRadius: 2,
                      shadowOffset: { width: 0, height: 1 },
                    }}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="font-semibold text-ink-900 text-sm">Edebi mod</Text>
                    {!isPro && (
                      <View className="bg-amber-500 rounded px-1.5 py-0.5">
                        <Text className="text-[8px] text-ink-900 font-bold">PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[10px] text-slate-500 mt-0.5">
                    Üslup ve nüansı koruyan çeviri (Claude)
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text className="text-[10px] text-slate-400 mt-4 text-center">
              {translate.data?.source === 'cache'
                ? '⚡ Cache'
                : translate.data?.source === 'gemini-pro'
                  ? 'Claude Sonnet'
                  : translate.data?.source === 'gemini-flash'
                    ? 'Gemini Flash'
                    : ''}
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
