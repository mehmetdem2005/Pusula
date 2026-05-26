import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Dimensions, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../src/components/ui/Button'
import { Input } from '../src/components/ui/Input'
import { useAddApiKey } from '../src/hooks/useApiKeys'
import { useUpdateOnboarding } from '../src/hooks/useSubjects'

const { width } = Dimensions.get('window')

export default function Onboarding() {
  const { t } = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [keyInput, setKeyInput] = useState('')
  const addKey = useAddApiKey()
  const completeOnboarding = useUpdateOnboarding()

  const finish = () => {
    completeOnboarding.mutate(true, {
      onSuccess: () => router.replace('/(tabs)'),
    })
  }

  const saveKey = () => {
    if (!keyInput.startsWith('gsk_')) {
      Alert.alert('', 'Groq anahtarı "gsk_" ile başlamalı. Atlamak da serbest.')
      return
    }
    addKey.mutate(
      { label: 'Ana Anahtar', key: keyInput.trim() },
      {
        onSuccess: () => setStep(2),
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <View className="flex-1 px-6 justify-between">
        {/* Üst — atla butonu */}
        <View className="flex-row justify-between items-center pt-2">
          <View className="flex-row gap-1.5">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full ${i === step ? 'w-8 bg-brand-950' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </View>
          {step < 2 && (
            <Pressable onPress={finish}>
              <Text className="text-slate-500">Atla</Text>
            </Pressable>
          )}
        </View>

        {/* İçerik */}
        <View className="flex-1 justify-center">
          {step === 0 && <Step1 />}
          {step === 1 && (
            <Step2
              keyInput={keyInput}
              setKeyInput={setKeyInput}
              onSave={saveKey}
              onSkip={() => setStep(2)}
              loading={addKey.isPending}
            />
          )}
          {step === 2 && <Step3 />}
        </View>

        {/* Alt — ilerleme */}
        <View className="pb-4">
          {step === 0 && (
            <Button title="Başlayalım" size="lg" fullWidth onPress={() => setStep(1)} />
          )}
          {step === 2 && (
            <Button
              title="Kavra'ya başla"
              size="lg"
              fullWidth
              onPress={finish}
              loading={completeOnboarding.isPending}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

function Step1() {
  return (
    <View className="items-center">
      <View className="w-24 h-24 bg-brand-950 rounded-3xl items-center justify-center mb-8">
        <Text className="text-white text-5xl font-serif">K</Text>
      </View>
      <Text className="text-4xl font-serif text-brand-950 text-center">Kavra'ya hoş geldin</Text>
      <View className="w-16 h-0.5 bg-accent-500 my-4" />
      <Text className="text-slate-600 text-center text-lg leading-7 px-4">
        150 pedagojik teknikle donanmış, Türkçe konuşan kişisel öğrenme AI'ın.
      </Text>

      <View className="mt-8 gap-3 w-full">
        <Feature emoji="🧠" text="150 teknik — aralıklı tekrardan Feynman'a" />
        <Feature emoji="🎙️" text="Sesli sor, konuşarak ders dinle" />
        <Feature emoji="📄" text="PDF yükle, fotoğraf çek, hemen kavra" />
      </View>
    </View>
  )
}

function Step2({
  keyInput,
  setKeyInput,
  onSave,
  onSkip,
  loading,
}: {
  keyInput: string
  setKeyInput: (s: string) => void
  onSave: () => void
  onSkip: () => void
  loading: boolean
}) {
  return (
    <View>
      <Text style={{ fontSize: 48, textAlign: 'center' }}>🔑</Text>
      <Text className="text-3xl font-serif text-brand-950 text-center mt-4">Anahtarın sende</Text>
      <Text className="text-slate-600 text-center text-base mt-3 leading-6 px-2">
        Kendi Groq anahtarınla sınırsız sohbet. Ücretsiz tier cömerttir — çoğu kullanıcı hiç para
        ödemez.
      </Text>

      <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mt-6">
        <Text className="text-brand-900 text-sm leading-5">
          1. console.groq.com adresine git, ücretsiz kayıt ol{'\n'}
          2. "API Keys" &gt; "Create API Key"{'\n'}
          3. Oluşan <Text className="font-mono">gsk_...</Text> anahtarını aşağı yapıştır
        </Text>
      </View>

      <View className="mt-6">
        <Input
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="gsk_..."
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Button title="Anahtarı Kaydet" onPress={onSave} loading={loading} fullWidth size="lg" />
      <Pressable onPress={onSkip} className="py-3 items-center mt-3">
        <Text className="text-slate-500">Sonra eklerim</Text>
      </Pressable>
    </View>
  )
}

function Step3() {
  return (
    <View className="items-center">
      <Text style={{ fontSize: 64 }}>🎉</Text>
      <Text className="text-3xl font-serif text-brand-950 text-center mt-6">Her şey hazır</Text>
      <Text className="text-slate-600 text-center text-lg leading-7 mt-4 px-4">
        Artık konuşmaya başlayabilirsin. Aklına ne gelirse sor — Kavra 150 tekniğin en uygun
        olanıyla cevaplasın.
      </Text>

      <View className="mt-8 bg-white rounded-2xl p-4 border border-slate-100 w-full">
        <Text className="text-sm text-slate-500 mb-2">İlk sorular için öneriler:</Text>
        <Text className="text-brand-950">• "Fotosentezi basitçe anlat"</Text>
        <Text className="text-brand-950 mt-1">
          • "Türev konusunda bana Feynman tekniğiyle ders ver"
        </Text>
        <Text className="text-brand-950 mt-1">• "Almanca A2 için kelime sınavı hazırla"</Text>
      </View>
    </View>
  )
}

function Feature({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View className="flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text className="flex-1 text-brand-950">{text}</Text>
    </View>
  )
}
