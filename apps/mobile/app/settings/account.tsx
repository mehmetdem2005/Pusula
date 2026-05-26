import { Stack, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { apiFetch } from '../../src/lib/api'

export default function AccountManagementScreen() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [reason, setReason] = useState('')
  const [pendingDeletion, setPendingDeletion] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'menu' | 'delete'>('menu')

  useEffect(() => {
    apiFetch<{ request: any }>('/api/account/deletion-status')
      .then((r) => setPendingDeletion(r.request))
      .catch(() => {})
  }, [])

  const handleExport = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/account/export-data', { method: 'POST' })
      Alert.alert(
        'Veri Hazır',
        `${Object.keys((data as any).data).length} tablo verisi alındı. Bir email gönderdik.`,
      )
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirmText !== 'HESABIMI SİL') {
      return Alert.alert('Onay Hatası', '"HESABIMI SİL" yazmalısın.')
    }
    setLoading(true)
    try {
      const res = await apiFetch<any>('/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirmText, reason }),
      })
      Alert.alert('Onaylandı', res.message, [{ text: 'Tamam', onPress: () => router.replace('/') }])
    } catch (e: any) {
      if (e.message?.includes('active_subscription')) {
        Alert.alert('Aktif Abonelik', 'Önce App Store/Play Store ayarlarından aboneliği iptal et.')
      } else {
        Alert.alert('Hata', e.message)
      }
    }
    setLoading(false)
  }

  const handleCancelDelete = async () => {
    setLoading(true)
    try {
      await apiFetch('/api/account/cancel-deletion', { method: 'POST' })
      setPendingDeletion(null)
      Alert.alert('İptal Edildi', 'Hesap silme isteğin iptal edildi.')
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
    setLoading(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: 'Hesap Yönetimi',
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 18 },
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Pending deletion banner */}
        {pendingDeletion && (
          <View className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Icon name="alert-triangle" size={18} color="#DC2626" />
              <Text className="font-serif text-base text-red-700">Hesap Siliniyor</Text>
            </View>
            <Text className="text-xs text-red-700 mb-3">
              Hesabın {new Date(pendingDeletion.scheduled_for).toLocaleDateString('tr-TR')}{' '}
              tarihinde silinecek.
            </Text>
            <Pressable
              onPress={handleCancelDelete}
              disabled={loading}
              className="bg-red-600 rounded-full py-2.5 items-center"
            >
              <Text className="text-white font-semibold text-sm">Silme İsteğini İptal Et</Text>
            </Pressable>
          </View>
        )}

        {step === 'menu' && (
          <>
            <Text className="font-serif text-3xl text-ink-900">Hesap</Text>
            <Text className="text-sm text-slate-600 mt-1 mb-6">
              Verilerine sahip çık. Her zaman indirebilir veya hesabı silebilirsin.
            </Text>

            {/* Data Export */}
            <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-3">
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-10 h-10 bg-cyan-50 rounded-xl items-center justify-center">
                  <Icon name="download" size={18} color="#0891B2" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-ink-900">Verilerini İndir</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    GDPR uyumlu, tüm veriler JSON
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleExport}
                disabled={loading}
                className="bg-cyan-600 rounded-full py-2.5 items-center mt-2"
              >
                <Text className="text-white font-semibold text-sm">
                  {loading ? 'Hazırlanıyor...' : 'İndir'}
                </Text>
              </Pressable>
            </View>

            {/* Privacy / Terms */}
            <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-3">
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center">
                  <Icon name="shield" size={18} color="#475569" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-ink-900">Gizlilik & Şartlar</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    kavra.app/privacy + kavra.app/terms
                  </Text>
                </View>
              </View>
            </View>

            {/* Delete Account */}
            {!pendingDeletion && (
              <View className="bg-red-50 border border-red-200 rounded-3xl p-4 mt-4">
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="w-10 h-10 bg-red-100 rounded-xl items-center justify-center">
                    <Icon name="trash" size={18} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-red-700">Hesabı Sil</Text>
                    <Text className="text-xs text-red-600 mt-0.5">14 gün geri alınabilir</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setStep('delete')}
                  className="bg-red-100 rounded-full py-2.5 items-center mt-2"
                >
                  <Text className="text-red-700 font-semibold text-sm">Devam Et</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {step === 'delete' && (
          <>
            <Pressable onPress={() => setStep('menu')} className="flex-row items-center gap-2 mb-4">
              <Icon name="chevron-left" size={18} color="#64748B" />
              <Text className="text-sm text-slate-600">Geri</Text>
            </Pressable>

            <Text className="font-serif text-3xl text-red-700">Hesabı Sil</Text>
            <Text className="text-sm text-slate-700 mt-2 leading-5">
              Hesabını silersen 14 gün içinde tekrar giriş yaparak iptal edebilirsin. 14 gün sonra:
            </Text>

            <View className="mt-3 mb-5 gap-2">
              {[
                'Tüm defterler, kaynaklar, sohbet geçmişi silinir',
                "Pro abonelik (varsa) iptal edilmez — App Store/Play Store'dan iptal et",
                'Anonim istatistikler analitik amaçla saklanır',
                "Email'ine veri export gönderilir",
              ].map((s) => (
                <View key={s} className="flex-row gap-2 items-start">
                  <Text className="text-amber-600 font-bold">•</Text>
                  <Text className="flex-1 text-xs text-slate-700 leading-5">{s}</Text>
                </View>
              ))}
            </View>

            <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-1.5">
              Silme Sebebi (opsiyonel)
            </Text>
            <TextInput
              placeholder="Daha iyi olabilmem için bana sebep söyle"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              maxLength={500}
              className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm mb-4"
              style={{ height: 80, textAlignVertical: 'top' }}
            />

            <Text className="font-mono text-[10px] text-red-600 tracking-widest uppercase mb-1.5">
              Onay — "HESABIMI SİL" yaz
            </Text>
            <TextInput
              placeholder="HESABIMI SİL"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              className="bg-white border-2 border-red-300 rounded-xl px-3 py-3 text-base mb-4"
            />

            <Pressable
              onPress={handleDelete}
              disabled={confirmText !== 'HESABIMI SİL' || loading}
              className={`rounded-full py-3 items-center ${
                confirmText === 'HESABIMI SİL' ? 'bg-red-600' : 'bg-slate-200'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className={`font-bold ${confirmText === 'HESABIMI SİL' ? 'text-white' : 'text-slate-500'}`}
                >
                  Hesabımı Sil (14 gün)
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
