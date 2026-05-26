import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../src/components/ui/Button'
import { useUpdateOnboarding } from '../src/hooks/useSubjects'
import { useOnboardingStore } from '../src/stores/onboarding'

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const completeOnboarding = useUpdateOnboarding()
  const setOnboardingCompleted = useOnboardingStore((s) => s.setCompleted)

  const finish = () => {
    // Gate anında geçişe izin versin diye store'u hemen güncelle,
    // DB'ye yazma arka planda devam eder.
    setOnboardingCompleted(true)
    completeOnboarding.mutate(true)
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <View className="flex-1 px-6 justify-between">
        <View className="flex-row justify-between items-center pt-2">
          <View className="flex-row gap-1.5">
            {[0, 1].map((i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full ${i === step ? 'w-8 bg-brand-950' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </View>
          {step < 1 && (
            <Pressable onPress={finish}>
              <Text className="text-slate-500">Atla</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-1 justify-center">
          {step === 0 && <Step1 />}
          {step === 1 && <Step2 />}
        </View>

        <View className="pb-4">
          {step === 0 && (
            <Button title="Başlayalım" size="lg" fullWidth onPress={() => setStep(1)} />
          )}
          {step === 1 && (
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

function Step2() {
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
