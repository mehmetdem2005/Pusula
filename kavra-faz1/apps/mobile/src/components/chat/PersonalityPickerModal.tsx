import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { type Personality, usePersonalities } from '../../hooks/useSubjects'

interface Props {
  visible: boolean
  onClose: () => void
  selectedId?: string | null
  onSelect: (p: Personality) => void
}

export function PersonalityPickerModal({ visible, onClose, selectedId, onSelect }: Props) {
  const { data: personalities, isLoading } = usePersonalities()

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl max-h-[80%]">
          <View className="p-4 pb-0">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-serif text-brand-950">AI Kişilik Seç</Text>
              <Pressable onPress={onClose}>
                <Text className="text-slate-500 text-base">Kapat</Text>
              </Pressable>
            </View>
            <Text className="text-slate-500 text-sm mb-4">
              Kavra'nın konuşma stilini seç. Ders sırasında değiştirebilirsin.
            </Text>
          </View>

          <ScrollView className="px-4 pb-6">
            {isLoading ? (
              <View className="py-12 items-center">
                <ActivityIndicator color="#1E1B4B" />
              </View>
            ) : (
              <View className="gap-2">
                {personalities?.map((p) => {
                  const selected = p.id === selectedId
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        onSelect(p)
                        onClose()
                      }}
                      className={[
                        'rounded-xl p-4 border flex-row items-center gap-3',
                        selected ? 'border-brand-950 bg-brand-50' : 'border-slate-100 bg-white',
                      ].join(' ')}
                    >
                      <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
                        <Text style={{ fontSize: 24 }}>{p.emoji ?? '🤖'}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-brand-950 text-base">{p.name}</Text>
                        <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={2}>
                          {p.system_prompt_fragment}
                        </Text>
                      </View>
                      {selected && <Text className="text-brand-950 text-xl">✓</Text>}
                    </Pressable>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
