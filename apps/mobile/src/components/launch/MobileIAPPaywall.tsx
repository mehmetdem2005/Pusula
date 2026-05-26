import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native'
import { useRevenueCat } from '../../hooks/useRevenueCat'
import { Icon } from '../ui/Icon'

/**
 * Mobile in-app purchase paywall
 * ===============================
 *
 * iOS / Android'de Stripe URL açma yerine native IAP açar.
 * Fiyatlar localized (cihaz para birimi).
 */

export function MobileIAPPaywall({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const { offerings, loading, isPro, purchase, restorePurchases } = useRevenueCat()
  const [purchasing, setPurchasing] = useState(false)
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null)

  if (loading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color="#F59E0B" />
        <Text className="text-xs text-slate-500 mt-2">Fiyatlar yükleniyor...</Text>
      </View>
    )
  }

  if (isPro) {
    return (
      <View className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 items-center">
        <Icon name="check-circle" size={36} color="#10B981" />
        <Text className="font-serif text-2xl text-emerald-900 mt-3">Pro Üyesin</Text>
        <Text className="text-sm text-emerald-700 text-center mt-1">
          Tüm Pro özellikleri açık. Teşekkürler 🎉
        </Text>
      </View>
    )
  }

  if (!offerings) {
    return (
      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <Text className="text-sm text-amber-900">
          Ödeme paketleri yüklenemedi. İnternet bağlantını kontrol et.
        </Text>
      </View>
    )
  }

  const monthly = offerings.monthly
  const annual = offerings.annual
  const lifetime = offerings.lifetime

  const handlePurchase = async (pkg: any) => {
    if (!pkg) return
    setSelectedPkg(pkg.identifier)
    setPurchasing(true)
    try {
      const res = await purchase(pkg)
      if (res.success && res.isPro) {
        Alert.alert('🎉 Hoş Geldin!', 'Pro üye oldun. Tüm özellikler açık.', [
          { text: 'Harika', onPress: () => onClose?.() ?? router.back() },
        ])
      } else if (res.cancelled) {
        // Sessizce iptal
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Satın alma başarısız')
    }
    setPurchasing(false)
    setSelectedPkg(null)
  }

  const handleRestore = async () => {
    setPurchasing(true)
    const res = await restorePurchases()
    setPurchasing(false)
    if (res.success && res.isPro) {
      Alert.alert('Geri Yüklendi', 'Pro abonelik aktif edildi.')
    } else {
      Alert.alert('Bulunamadı', 'Bu Apple ID/Google Hesabı altında aktif Pro abonelik bulunamadı.')
    }
  }

  return (
    <View>
      {/* Lifetime Early Bird */}
      {lifetime && (
        <Pressable
          onPress={() => handlePurchase(lifetime)}
          disabled={purchasing}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-4 mb-3 border-2 border-amber-700"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="font-mono text-[9px] text-ink-900 tracking-widest font-bold uppercase bg-white/40 px-1.5 py-0.5 rounded">
                  Tek Seferlik
                </Text>
              </View>
              <Text className="font-serif text-2xl text-ink-900">Lifetime</Text>
              <Text className="text-xs text-ink-900/70 mt-1">Bir kez öde, ömür boyu Pro</Text>
            </View>
            <View className="items-end">
              <Text className="font-serif text-3xl text-ink-900">
                {lifetime.product.priceString}
              </Text>
              {selectedPkg === lifetime.identifier && purchasing && (
                <ActivityIndicator size="small" color="#1E1B4B" />
              )}
            </View>
          </View>
        </Pressable>
      )}

      {/* Annual */}
      {annual && (
        <Pressable
          onPress={() => handlePurchase(annual)}
          disabled={purchasing}
          className="bg-ink-900 rounded-3xl p-4 mb-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="font-mono text-[9px] text-amber-500 tracking-widest font-bold uppercase">
                  En Popüler · 3 ay bedava
                </Text>
              </View>
              <Text className="font-serif text-xl text-cream-50">Yıllık</Text>
              <Text className="text-xs text-cream-50/60 mt-1">~%30 indirim, taahhüt yok</Text>
            </View>
            <View className="items-end">
              <Text className="font-serif text-2xl text-cream-50">
                {annual.product.priceString}
              </Text>
              <Text className="text-[10px] text-cream-50/60">/ yıl</Text>
              {selectedPkg === annual.identifier && purchasing && (
                <ActivityIndicator size="small" color="#F59E0B" />
              )}
            </View>
          </View>
        </Pressable>
      )}

      {/* Monthly */}
      {monthly && (
        <Pressable
          onPress={() => handlePurchase(monthly)}
          disabled={purchasing}
          className="bg-white border border-slate-200 rounded-3xl p-4 mb-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-serif text-xl text-ink-900">Aylık</Text>
              <Text className="text-xs text-slate-500 mt-1">İstediğin zaman iptal et</Text>
            </View>
            <View className="items-end">
              <Text className="font-serif text-2xl text-ink-900">
                {monthly.product.priceString}
              </Text>
              <Text className="text-[10px] text-slate-500">/ ay</Text>
              {selectedPkg === monthly.identifier && purchasing && (
                <ActivityIndicator size="small" color="#1E1B4B" />
              )}
            </View>
          </View>
        </Pressable>
      )}

      {/* Restore */}
      <Pressable onPress={handleRestore} disabled={purchasing} className="py-3">
        <Text className="text-xs text-slate-500 text-center">
          Daha önce satın aldıysan{' '}
          <Text className="text-ink-900 underline font-semibold">Satın Alımları Geri Yükle</Text>
        </Text>
      </Pressable>

      <Text className="text-[9px] text-slate-400 text-center mt-2 leading-4">
        {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} hesabından otomatik yenilenir.{'\n'}
        Yenilemenin durması için süresinin bitmesinden 24 saat önce iptal et.
      </Text>
    </View>
  )
}
