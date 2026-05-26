import { useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiFetch } from '../../lib/api'
import { Icon } from '../ui/Icon'
import { HandwritingCanvas } from './HandwritingCanvas'

interface Props {
  visible: boolean
  onClose: () => void
  onRecognized: (text: string) => void
  mode?: 'text' | 'math' | 'mixed'
}

export function HandwritingModal({ visible, onClose, onRecognized, mode = 'mixed' }: Props) {
  const [recognizing, setRecognizing] = useState(false)
  const [currentMode, setCurrentMode] = useState(mode)

  const handleRecognize = async (base64: string) => {
    setRecognizing(true)
    try {
      const res = await apiFetch<{ text: string }>('/api/handwriting/recognize', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: base64,
          mode: currentMode,
        }),
      })

      if (!res.text) {
        Alert.alert('Tanınamadı', 'Yazıyı net göremedik. Tekrar deneyebilir misin?')
      } else {
        onRecognized(res.text)
        onClose()
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
    setRecognizing(false)
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-cream-50">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name="x" size={20} color="#1E1B4B" />
          </Pressable>
          <Text className="font-serif text-base text-ink-900">El Yazısı</Text>
          <View style={{ width: 20 }} />
        </View>

        {/* Mode tabs */}
        <View className="flex-row gap-2 px-4 py-3">
          {[
            { value: 'text' as const, label: 'Metin', icon: 'type' as const },
            { value: 'math' as const, label: 'Matematik', icon: 'calculator' as const },
            { value: 'mixed' as const, label: 'Karışık', icon: 'edit' as const },
          ].map((m) => (
            <Pressable
              key={m.value}
              onPress={() => setCurrentMode(m.value)}
              className={`flex-1 py-2 rounded-full flex-row items-center justify-center gap-1 ${
                currentMode === m.value ? 'bg-ink-900' : 'bg-white border border-slate-200'
              }`}
            >
              <Icon
                name={m.icon}
                size={11}
                color={currentMode === m.value ? '#F59E0B' : '#475569'}
              />
              <Text
                className={`text-[11px] font-bold ${currentMode === m.value ? 'text-cream-50' : 'text-slate-600'}`}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-1 p-4">
          <HandwritingCanvas onRecognize={handleRecognize} />
        </View>

        {recognizing && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text className="text-sm text-ink-900 mt-3 font-semibold">Yazı tanınıyor...</Text>
              <Text className="text-[10px] text-slate-500 mt-1">Gemini Vision · ~2sn</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}
