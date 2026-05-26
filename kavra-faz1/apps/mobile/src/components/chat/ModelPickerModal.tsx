import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { type LLMModel, useChatModels } from '../../hooks/useModels'

interface Props {
  visible: boolean
  onClose: () => void
  selectedModelId?: string | null
  onSelect: (model: LLMModel) => void
}

const categoryLabels: Record<string, { emoji: string; label: string; desc: string }> = {
  fast: { emoji: '⚡', label: 'Hızlı', desc: 'Kısa sorular için' },
  versatile: { emoji: '🧠', label: 'Versatile', desc: 'Genel kullanım' },
  vision: { emoji: '👁️', label: 'Vision', desc: 'Resim analizi' },
  reasoning: { emoji: '🔬', label: 'Reasoning', desc: 'Karmaşık problemler' },
  compound: { emoji: '🛠️', label: 'Compound', desc: 'Araçlarla' },
}

export function ModelPickerModal({ visible, onClose, selectedModelId, onSelect }: Props) {
  const { data: models, isLoading } = useChatModels()

  // Kategoriye göre grupla
  const grouped = (models ?? []).reduce<Record<string, LLMModel[]>>((acc, m) => {
    const cat = m.category ?? 'versatile'
    if (!acc[cat]) acc[cat] = []
    acc[cat]!.push(m)
    return acc
  }, {})

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl max-h-[80%]">
          <View className="p-4 pb-0">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-serif text-brand-950">Model Seç</Text>
              <Pressable onPress={onClose}>
                <Text className="text-slate-500 text-base">Kapat</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView className="px-4 pb-6">
            {isLoading ? (
              <View className="py-12 items-center">
                <ActivityIndicator color="#1E1B4B" />
              </View>
            ) : !models || models.length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-slate-500 text-center">
                  Henüz model yok. Admin panelden senkronize et.
                </Text>
              </View>
            ) : (
              Object.entries(grouped).map(([cat, items]) => {
                const meta = categoryLabels[cat] ?? { emoji: '•', label: cat, desc: '' }
                return (
                  <View key={cat} className="mb-4">
                    <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">
                      {meta.emoji} {meta.label} · {meta.desc}
                    </Text>
                    <View className="gap-2">
                      {items.map((m) => {
                        const selected = m.id === selectedModelId
                        return (
                          <Pressable
                            key={m.id}
                            onPress={() => {
                              onSelect(m)
                              onClose()
                            }}
                            className={[
                              'rounded-xl p-3 border',
                              selected
                                ? 'border-brand-950 bg-brand-50'
                                : 'border-slate-100 bg-white',
                            ].join(' ')}
                          >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-1">
                                <Text className="font-semibold text-brand-950">
                                  {m.display_name}
                                </Text>
                                <Text className="text-xs text-slate-500 mt-0.5">
                                  {m.model_id}
                                  {m.context_window
                                    ? ` · ${Math.round(m.context_window / 1000)}K context`
                                    : ''}
                                </Text>
                              </View>
                              {selected && <Text className="text-brand-950 text-xl">✓</Text>}
                              {m.is_recommended && !selected && (
                                <View className="bg-accent-500/15 px-2 py-0.5 rounded">
                                  <Text className="text-accent-700 text-xs font-semibold">
                                    Önerilen
                                  </Text>
                                </View>
                              )}
                            </View>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                )
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
