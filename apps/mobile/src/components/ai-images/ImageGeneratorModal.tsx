import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useGenerateImage } from '../../hooks/useAIImages'
import { useIsPro } from '../../hooks/useEntitlement'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'

interface Props {
  visible: boolean
  onClose: () => void
  conversationId?: string
  onGenerated?: (imageUrl: string, prompt: string) => void
}

const ASPECT_RATIOS = [
  { v: '1:1', l: 'Kare', w: 32, h: 32 },
  { v: '16:9', l: 'Yatay', w: 40, h: 22 },
  { v: '9:16', l: 'Dikey', w: 22, h: 40 },
  { v: '4:3', l: 'Klasik', w: 36, h: 27 },
] as const

export function ImageGeneratorModal({ visible, onClose, conversationId, onGenerated }: Props) {
  const isPro = useIsPro()
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]['v']>('1:1')
  const [model, setModel] = useState<'flux-schnell' | 'flux-dev'>('flux-schnell')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null)

  const generate = useGenerateImage()

  const handleGenerate = async () => {
    if (!prompt.trim()) return Alert.alert('Açıklama gerekli')

    try {
      const result = await generate.mutateAsync({
        prompt: prompt.trim(),
        conversationId,
        model,
        aspectRatio,
      })
      setResultUrl(result.imageUrl)
      setUsage(result.usage)
    } catch (e: any) {
      if (e.message?.includes('pro_required')) {
        Alert.alert('👑 Pro özelliği', "AI görsel üretimi Pro üyeler için. Pro'ya geçer misin?")
      } else if (e.message?.includes('monthly_limit')) {
        Alert.alert('Aylık hak doldu', 'Bu ay görsel hakkın bitti. Sonraki ay yenilenir.')
      } else {
        Alert.alert('Hata', e.message ?? 'Görsel üretilemedi')
      }
    }
  }

  const handleUseInChat = () => {
    if (resultUrl) {
      onGenerated?.(resultUrl, prompt)
      reset()
      onClose()
    }
  }

  const reset = () => {
    setPrompt('')
    setResultUrl(null)
    setUsage(null)
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-cream-50 rounded-t-3xl pt-4" style={{ maxHeight: '92%' }}>
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-3" />

            <View className="flex-row items-center justify-between px-6 mb-4">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Icon name="sparkles" size={16} color="#F59E0B" />
                  <Text className="font-mono text-[10px] text-amber-600 tracking-widest uppercase">
                    Pro Özellik
                  </Text>
                </View>
                <Text className="font-serif text-2xl text-ink-900">
                  AI ile <Text className="text-amber-500 italic">görsel</Text>
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Icon name="x" size={24} color="#64748B" />
              </Pressable>
            </View>

            {!isPro && (
              <View className="mx-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 flex-row items-center gap-3">
                <Icon name="crown" size={24} color="#F59E0B" fill="#F59E0B" />
                <View className="flex-1">
                  <Text className="font-semibold text-amber-900 text-sm">Pro üyeler için</Text>
                  <Text className="text-xs text-amber-700 mt-0.5">
                    Aylık 100 görsel üretim · Flux Schnell
                  </Text>
                </View>
              </View>
            )}

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              {/* Result preview */}
              {resultUrl && (
                <View className="mb-4">
                  <View
                    className="rounded-3xl overflow-hidden bg-ink-950"
                    style={{
                      aspectRatio:
                        aspectRatio === '1:1' ? 1 : aspectRatio === '16:9' ? 16 / 9 : 9 / 16,
                    }}
                  >
                    <Image
                      source={{ uri: resultUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                  {usage && (
                    <Text className="text-[11px] text-slate-500 text-center mt-2">
                      Bu ay: {usage.used} / {usage.limit} görsel
                    </Text>
                  )}
                  <View className="flex-row gap-2 mt-3">
                    <View className="flex-1">
                      <Button
                        title="Tekrar Üret"
                        variant="secondary"
                        onPress={handleGenerate}
                        loading={generate.isPending}
                      />
                    </View>
                    <View className="flex-1">
                      <Button title="Sohbete Ekle" onPress={handleUseInChat} icon="send" />
                    </View>
                  </View>
                </View>
              )}

              {!resultUrl && (
                <>
                  <Input
                    label="AÇIKLAMA"
                    value={prompt}
                    onChangeText={setPrompt}
                    placeholder="Türev kavramını anlatan bir grafik..."
                    multiline
                  />

                  <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-4 mb-2">
                    En-Boy
                  </Text>
                  <View className="flex-row gap-2 mb-4">
                    {ASPECT_RATIOS.map((a) => (
                      <Pressable
                        key={a.v}
                        onPress={() => setAspectRatio(a.v)}
                        className={`flex-1 items-center py-3 rounded-xl border ${
                          aspectRatio === a.v
                            ? 'border-ink-900 bg-ink-50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <View
                          className="rounded"
                          style={{
                            width: a.w / 2,
                            height: a.h / 2,
                            backgroundColor: aspectRatio === a.v ? '#1E1B4B' : '#CBD5E1',
                          }}
                        />
                        <Text className="text-[10px] text-slate-700 mt-1.5">{a.l}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                    Model
                  </Text>
                  <View className="flex-row gap-2 mb-4">
                    <Pressable
                      onPress={() => setModel('flux-schnell')}
                      className={`flex-1 p-3 rounded-xl border ${
                        model === 'flux-schnell'
                          ? 'border-ink-900 bg-ink-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className="font-semibold text-ink-900 text-xs">Flux Schnell</Text>
                      <Text className="text-[10px] text-slate-500 mt-0.5">Hızlı · ~3sn</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setModel('flux-dev')}
                      className={`flex-1 p-3 rounded-xl border ${
                        model === 'flux-dev'
                          ? 'border-ink-900 bg-ink-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className="font-semibold text-ink-900 text-xs">Flux Dev</Text>
                      <Text className="text-[10px] text-slate-500 mt-0.5">
                        Kaliteli · ~15sn · 2 kredi
                      </Text>
                    </Pressable>
                  </View>

                  <Button
                    title={generate.isPending ? 'Üretiliyor... ✨' : 'Görsel Üret'}
                    onPress={handleGenerate}
                    loading={generate.isPending}
                    disabled={!prompt.trim() || !isPro}
                    icon="sparkles"
                    fullWidth
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
