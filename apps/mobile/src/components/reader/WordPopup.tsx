import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useLookupWord } from '../../hooks/useDictionary'
import { Icon } from '../ui/Icon'

interface Props {
  word: string
  sentence: string
  sourceLang: string
  targetLang: string
  bookId?: string
  onClose: () => void
  onSavedToVocab?: () => void
  onLookedUp?: () => void
}

/**
 * WordPopup
 * =========
 *
 * Linga'nın "made/Crime" popup'ı:
 *  - Kelime + lemma (eğer farklıysa)
 *  - IPA telaffuz
 *  - Türkçe çeviriler
 *  - Tanım listesi (anlam, partOfSpeech, örnek)
 *  - "Sözlüğe ekle" butonu
 *  - "AI ile bağlam çevirisi" (Pro)
 */
export function WordPopup({
  word,
  sentence,
  sourceLang,
  targetLang,
  bookId,
  onClose,
  onSavedToVocab,
  onLookedUp,
}: Props) {
  const lookup = useLookupWord()
  const [audioPlaying, setAudioPlaying] = useState(false)

  useEffect(() => {
    onLookedUp?.()
    lookup.mutate(
      {
        word,
        sourceLang,
        targetLang,
        context: sentence,
        bookId,
        sentenceText: sentence,
        saveToVocab: true,
      },
      {
        onSuccess: () => onSavedToVocab?.(),
      },
    )
  }, [word])

  const playAudio = async () => {
    if (!lookup.data?.pronunciationAudioUrl) return
    setAudioPlaying(true)
    try {
      const { Audio } = await import('expo-av')
      const { sound } = await Audio.Sound.createAsync({ uri: lookup.data.pronunciationAudioUrl })
      await sound.playAsync()
      setTimeout(() => sound.unloadAsync(), 5000)
    } finally {
      setTimeout(() => setAudioPlaying(false), 1500)
    }
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8" style={{ maxHeight: '70%' }}>
          {/* Drag handle */}
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-3" />

          {/* Header */}
          <View className="px-6 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={playAudio}
                hitSlop={10}
                className="w-10 h-10 bg-ink-900 rounded-full items-center justify-center"
              >
                <Icon name={audioPlaying ? 'volume' : 'volume'} size={18} color="#F59E0B" />
              </Pressable>
              <View className="bg-amber-50 rounded-full px-3 py-1">
                <Text className="text-amber-700 text-xs font-mono font-bold">x1</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Icon name="x" size={24} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
            {/* Word + IPA */}
            <Text className="font-serif text-3xl text-ink-900">{word}</Text>
            {lookup.data?.ipa && (
              <Text className="text-base text-slate-500 font-mono mt-1">[{lookup.data.ipa}]</Text>
            )}

            {/* Loading */}
            {lookup.isPending && (
              <View className="py-6 items-center">
                <ActivityIndicator color="#F59E0B" />
                <Text className="text-xs text-slate-500 mt-2">Anlamı aranıyor...</Text>
              </View>
            )}

            {/* Translations */}
            {lookup.data && lookup.data.translations.length > 0 && (
              <View className="mt-4 flex-row flex-wrap gap-2">
                {lookup.data.translations.map((t, i) => (
                  <View
                    key={i}
                    className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1"
                  >
                    <Text className="text-amber-900 text-sm">{t}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Definitions */}
            {lookup.data && lookup.data.definitions.length > 0 && (
              <View className="mt-5">
                <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
                  Anlamlar
                </Text>
                {lookup.data.definitions.map((d, i) => (
                  <View key={i} className="mb-3">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className="bg-ink-900 px-2 py-0.5 rounded">
                        <Text className="text-cream-50 text-[9px] font-bold uppercase">
                          {d.partOfSpeech}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-ink-900 text-sm leading-5">{d.definition}</Text>
                    {d.example && (
                      <Text className="text-xs text-slate-600 italic mt-1 leading-4">
                        "{d.example}"
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Synonyms */}
            {lookup.data?.examples && lookup.data.examples.length > 0 && (
              <View className="mt-3">
                <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
                  Örnekler
                </Text>
                {lookup.data.examples.slice(0, 3).map((ex, i) => (
                  <View key={i} className="bg-white border border-slate-100 rounded-xl p-3 mb-2">
                    <Text className="text-ink-900 text-sm">{ex.source}</Text>
                    <Text className="text-slate-500 text-xs mt-1">→ {ex.translation}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Source attribution */}
            {lookup.data && (
              <Text className="text-[9px] text-slate-400 mt-4 text-center">
                {lookup.data.source === 'cache'
                  ? '⚡ Sözlükte var'
                  : lookup.data.source === 'free-dict'
                    ? 'Free Dictionary'
                    : 'AI sözlüğü'}
              </Text>
            )}

            {/* Add to dictionary CTA */}
            <View className="mt-5 mb-3">
              <View className="flex-row items-center gap-2 px-1 py-2">
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text className="text-emerald-700 text-xs font-medium">
                  Kelime sözlüğüne eklendi · SRS'e dahil edildi
                </Text>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
