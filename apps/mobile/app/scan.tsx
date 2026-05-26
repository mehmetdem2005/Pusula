import * as ImagePicker from 'expo-image-picker'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../src/components/ui/Button'
import { type VisionTask, useAnalyzeImage } from '../src/hooks/useVision'

const TASKS: Array<{ id: VisionTask; emoji: string; label: string; desc: string }> = [
  { id: 'solve_math', emoji: '🔢', label: 'Matematik Sorusu', desc: 'Adım adım çözüm üret' },
  {
    id: 'explain_handwriting',
    emoji: '✍️',
    label: 'El Yazısı Notu',
    desc: 'Önce oku, sonra konuyu açıkla',
  },
  { id: 'extract_text', emoji: '📝', label: 'Metni Çıkar', desc: 'Resimdeki yazıyı transkribe et' },
  { id: 'analyze_diagram', emoji: '📊', label: 'Diyagram', desc: 'Şemayı parça parça açıkla' },
  { id: 'describe', emoji: '🖼️', label: 'Genel Tanım', desc: 'Resimde ne var, ne anlatıyor?' },
]

export default function Scan() {
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [task, setTask] = useState<VisionTask>('solve_math')
  const [result, setResult] = useState<string | null>(null)
  const analyze = useAnalyzeImage()

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('', 'Kamera izni gerekli')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
      setResult(null)
    }
  }

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('', 'Galeri izni gerekli')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
      setResult(null)
    }
  }

  const handleAnalyze = () => {
    if (!imageUri) return
    analyze.mutate(
      { uri: imageUri, task },
      {
        onSuccess: (r) => setResult(r.result),
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  const reset = () => {
    setImageUri(null)
    setResult(null)
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Fotoğraflarla Öğren',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />

      <ScrollView className="flex-1 px-5 pt-4">
        {!imageUri ? (
          <>
            <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
              <Text className="text-brand-900 font-semibold mb-1">📸 Fotoğrafla</Text>
              <Text className="text-brand-800 text-sm leading-5">
                Bir matematik sorusu, el yazısı not veya diyagram fotoğrafı çek. Kavra Llama 4 Scout
                vision'ıyla analiz etsin.
              </Text>
            </View>

            <View className="gap-3">
              <Button title="📷 Kamera ile Çek" onPress={pickFromCamera} fullWidth size="lg" />
              <Button
                title="🖼️ Galeriden Seç"
                onPress={pickFromGallery}
                variant="secondary"
                fullWidth
                size="lg"
              />
            </View>
          </>
        ) : (
          <>
            <View className="bg-white rounded-2xl p-2 border border-slate-100">
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 240, borderRadius: 12 }}
                resizeMode="cover"
              />
              <Pressable
                onPress={reset}
                className="absolute top-4 right-4 bg-black/60 w-8 h-8 rounded-full items-center justify-center"
              >
                <Text className="text-white text-lg">✕</Text>
              </Pressable>
            </View>

            {!result && (
              <>
                <Text className="text-xs font-semibold text-slate-400 uppercase mt-6 mb-2 px-1">
                  Ne yapmamı istersin?
                </Text>
                <View className="gap-2">
                  {TASKS.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => setTask(t.id)}
                      className={[
                        'rounded-xl p-3 border flex-row items-center gap-3',
                        task === t.id
                          ? 'border-brand-950 bg-brand-50'
                          : 'border-slate-100 bg-white',
                      ].join(' ')}
                    >
                      <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
                      <View className="flex-1">
                        <Text className="font-semibold text-brand-950">{t.label}</Text>
                        <Text className="text-xs text-slate-500">{t.desc}</Text>
                      </View>
                      {task === t.id && <Text className="text-brand-950 text-xl">✓</Text>}
                    </Pressable>
                  ))}
                </View>

                <View className="mt-6">
                  <Button
                    title={analyze.isPending ? 'Analiz ediliyor...' : 'Analiz Et'}
                    onPress={handleAnalyze}
                    loading={analyze.isPending}
                    fullWidth
                    size="lg"
                  />
                </View>
              </>
            )}

            {analyze.isPending && (
              <View className="mt-6 p-6 bg-white rounded-2xl items-center">
                <ActivityIndicator color="#1E1B4B" size="large" />
                <Text className="text-slate-500 text-sm mt-3">Llama 4 Scout düşünüyor...</Text>
              </View>
            )}

            {result && (
              <View className="mt-6 bg-white rounded-2xl p-5 border border-slate-100">
                <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">Sonuç</Text>
                <Text className="text-brand-950 leading-7" selectable>
                  {result}
                </Text>
                <View className="mt-6 pt-4 border-t border-slate-100">
                  <Button title="Yeni Fotoğraf" onPress={reset} variant="secondary" fullWidth />
                </View>
              </View>
            )}
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
