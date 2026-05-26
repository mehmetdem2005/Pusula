import { Stack, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../src/components/ui/Button'
import { useEntitlement, usePricing } from '../src/hooks/useEntitlement'
import { apiFetch } from '../src/lib/api'

const FEATURES = [
  { emoji: '🎙️', title: 'Voice Cloning', desc: 'Kendi sesini kaydet, AI o sesle anlatsın' },
  { emoji: '🎨', title: '7 Premium Tema', desc: "Forest Dawn'dan Cosmic'e" },
  { emoji: '🌐', title: '3D Kavram Haritası', desc: 'Konseptlerini 3 boyutta keşfet' },
  { emoji: '📄', title: 'Sınırsız PDF', desc: "Free'de aylık 5, Pro'da sınır yok" },
  { emoji: '🎭', title: '7 AI Kişilik', desc: 'Her ders için farklı tarz' },
  { emoji: '🔊', title: 'Kaliteli TTS', desc: 'Cihaz değil, sunucu seslendirme' },
  { emoji: '📊', title: 'Detaylı Analitik', desc: 'Aylık & yıllık raporlar' },
  { emoji: '⏰', title: 'Akıllı Hatırlatıcılar', desc: 'Optimal zamanda push' },
]

export default function Upgrade() {
  const router = useRouter()
  const { data: entitlement } = useEntitlement()
  const { data: pricing, isLoading } = usePricing()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const earlyBirdLeft = pricing?.earlyBirdRemaining ?? 0

  // Zaten Pro ise teşekkür ekranı
  if (entitlement?.isPro) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50">
        <Stack.Screen options={{ title: 'Pro Üyelik' }} />
        <View className="flex-1 p-8 items-center justify-center">
          <Text style={{ fontSize: 80 }}>👑</Text>
          <Text className="text-3xl font-serif text-brand-950 mt-4 text-center">
            Sen zaten Pro'sun
          </Text>
          <Text className="text-slate-600 text-center mt-2">
            {entitlement.tier === 'pro_lifetime'
              ? 'Lifetime üyeliğin var. Ömür boyu Pro!'
              : `Üyelik ${entitlement.currentPeriodEnd ? new Date(entitlement.currentPeriodEnd).toLocaleDateString('tr-TR') : 'aktif'}`}
          </Text>

          {entitlement.tier !== 'pro_lifetime' && (
            <Pressable
              onPress={async () => {
                try {
                  const { url } = await apiFetch<{ url: string }>('/api/stripe/portal', {
                    method: 'POST',
                  })
                  await WebBrowser.openBrowserAsync(url)
                } catch (e: any) {
                  Alert.alert('Hata', e.message)
                }
              }}
              className="mt-8 bg-brand-950 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Üyeliği Yönet</Text>
            </Pressable>
          )}

          <Pressable onPress={() => router.back()} className="mt-4">
            <Text className="text-slate-500">Geri</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const handleCheckout = async (tier: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime') => {
    setLoadingTier(tier)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          tier,
          successUrl: 'kavra://upgrade-success',
          cancelUrl: 'kavra://upgrade-cancel',
        }),
      })

      const result = await WebBrowser.openAuthSessionAsync(url, 'kavra://')
      if (result.type === 'success' && result.url.includes('upgrade-success')) {
        Alert.alert('🎉', "Teşekkür ederim! Pro'ya hoş geldin.", [
          { text: 'Süper', onPress: () => router.back() },
        ])
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Kavra Pro',
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Hero */}
        <View className="bg-brand-950 rounded-3xl p-6 mb-4">
          <Text style={{ fontSize: 48 }}>👑</Text>
          <Text className="text-white text-3xl font-serif mt-2">Kavra Pro</Text>
          <Text className="text-white/80 text-base mt-1">Tüm özellikleri aç, daha derin öğren</Text>
        </View>

        {/* Early bird badge */}
        {earlyBirdLeft > 0 && earlyBirdLeft <= 50 && (
          <View className="bg-accent-500/15 border border-accent-500 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
            <Text style={{ fontSize: 28 }}>⚡</Text>
            <View className="flex-1">
              <Text className="text-accent-700 font-bold">
                Sadece {earlyBirdLeft} lifetime kaldı
              </Text>
              <Text className="text-amber-800 text-sm">$99 — sonra fiyat 199$ olacak</Text>
            </View>
          </View>
        )}

        {/* Plan kartları */}
        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" />
        ) : (
          <View className="gap-3 mb-4">
            <PlanCard
              tier="pro_monthly"
              title="Aylık"
              price="$4.99"
              period="/ay"
              features={['Tüm Pro özellikleri', 'İstediğin zaman iptal']}
              loading={loadingTier === 'pro_monthly'}
              onPress={() => handleCheckout('pro_monthly')}
            />
            <PlanCard
              tier="pro_yearly"
              title="Yıllık"
              price="$39"
              period="/yıl"
              badge="%35 indirim"
              recommended
              features={['Tüm Pro özellikleri', 'Aylığa göre $20 tasarruf']}
              loading={loadingTier === 'pro_yearly'}
              onPress={() => handleCheckout('pro_yearly')}
            />
            <PlanCard
              tier="pro_lifetime"
              title="Lifetime"
              price="$99"
              period="tek seferlik"
              badge={earlyBirdLeft > 0 ? `${earlyBirdLeft} kaldı` : 'Tükendi'}
              features={['Ömür boyu Pro', 'Tek ödeme — sonsuza kadar']}
              loading={loadingTier === 'pro_lifetime'}
              disabled={earlyBirdLeft === 0}
              onPress={() => handleCheckout('pro_lifetime')}
            />
          </View>
        )}

        {/* Özellikler */}
        <Text className="text-xs font-semibold text-slate-400 uppercase mb-3 mt-2 px-1">
          Pro ile gelen
        </Text>
        <View className="gap-3 mb-8">
          {FEATURES.map((f, i) => (
            <View
              key={i}
              className="bg-white rounded-2xl p-4 border border-slate-100 flex-row items-start gap-3"
            >
              <Text style={{ fontSize: 28 }}>{f.emoji}</Text>
              <View className="flex-1">
                <Text className="font-bold text-brand-950">{f.title}</Text>
                <Text className="text-slate-600 text-sm mt-0.5">{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Restore */}
        <View className="mb-8 items-center">
          <Pressable
            onPress={() =>
              Alert.alert(
                '',
                'Stripe satın alımları otomatik dönecek. App Store/Play satın alımları için login yap, üyelik aktif olur.',
              )
            }
            className="py-2"
          >
            <Text className="text-brand-700 underline">Satın alımı geri yükle</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function PlanCard({
  tier,
  title,
  price,
  period,
  features,
  recommended,
  badge,
  loading,
  disabled,
  onPress,
}: {
  tier: string
  title: string
  price: string
  period: string
  features: string[]
  recommended?: boolean
  badge?: string
  loading?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <View
      className={[
        'rounded-2xl p-5 border-2',
        recommended ? 'bg-brand-50 border-brand-950' : 'bg-white border-slate-200',
      ].join(' ')}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View>
          <Text className="font-bold text-brand-950 text-lg">{title}</Text>
          {recommended && <Text className="text-accent-700 text-xs font-bold">⭐ ÖNERİLEN</Text>}
        </View>
        {badge && (
          <View className="bg-accent-500 px-2 py-0.5 rounded-full">
            <Text className="text-white text-xs font-bold">{badge}</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-end gap-1 my-2">
        <Text className="text-brand-950 text-4xl font-bold">{price}</Text>
        <Text className="text-slate-500 mb-2">{period}</Text>
      </View>

      <View className="gap-1 my-2">
        {features.map((f, i) => (
          <View key={i} className="flex-row items-center gap-2">
            <Text className="text-green-600">✓</Text>
            <Text className="text-slate-700 text-sm">{f}</Text>
          </View>
        ))}
      </View>

      <View className="mt-3">
        <Button
          title={disabled ? 'Tükendi' : `${title} Al`}
          onPress={onPress}
          loading={loading}
          disabled={disabled}
          variant={recommended ? 'primary' : 'secondary'}
          fullWidth
        />
      </View>
    </View>
  )
}
