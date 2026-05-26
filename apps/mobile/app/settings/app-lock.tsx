import { Stack } from 'expo-router'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppLockStore, useBiometricCapabilities } from '../../src/hooks/useAppLock'

const TIMEOUT_OPTIONS = [
  { label: 'Anında', value: 0 },
  { label: '30 saniye', value: 30 },
  { label: '1 dakika', value: 60 },
  { label: '5 dakika', value: 300 },
  { label: '15 dakika', value: 900 },
]

export default function AppLockSettings() {
  const settings = useAppLockStore((s) => s.settings)
  const setSettings = useAppLockStore((s) => s.setSettings)
  const caps = useBiometricCapabilities()

  const toggle = (enabled: boolean) => {
    if (enabled && !caps.enrolled) {
      Alert.alert(
        'Biyometrik Yok',
        'Cihaz ayarlarından bir biyometrik kayıt et (Face ID, parmak izi).',
      )
      return
    }
    setSettings({ enabled })
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'App Lock',
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Açıklama */}
        <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
          <Text className="text-brand-900 font-semibold mb-1">🔒 Gizlilik</Text>
          <Text className="text-brand-800 text-sm leading-5">
            Kavra'yı her açışında biyometrik doğrulama isteyebilirsin. Yansımaların ve hata
            portföyün kişisel olduğu için iyi bir koruma.
          </Text>
        </View>

        {/* Toggle */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-3 flex-row items-center">
          <View className="flex-1">
            <Text className="text-brand-950 font-semibold">App Lock</Text>
            <Text className="text-slate-500 text-xs mt-0.5">
              {caps.enrolled
                ? `${caps.types.includes(2) ? 'Face ID' : ''}${caps.types.includes(1) ? ' Parmak izi' : ''} kullanılabilir`
                : 'Biyometrik kayıt yok'}
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={toggle}
            disabled={!caps.available}
            trackColor={{ false: '#E2E8F0', true: '#1E1B4B' }}
          />
        </View>

        {/* Timeout */}
        {settings.enabled && (
          <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-3">
            <Text className="text-brand-950 font-semibold mb-3">Kilit Zamanlaması</Text>
            <Text className="text-slate-500 text-xs mb-3">
              Kavra'yı arka plana atınca ne kadar sonra tekrar kilitlensin?
            </Text>
            <View className="gap-2">
              {TIMEOUT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSettings({ timeoutSeconds: opt.value })}
                  className={[
                    'p-3 rounded-xl border flex-row items-center justify-between',
                    settings.timeoutSeconds === opt.value
                      ? 'border-brand-950 bg-brand-50'
                      : 'border-slate-100 bg-white',
                  ].join(' ')}
                >
                  <Text className="text-brand-950">{opt.label}</Text>
                  {settings.timeoutSeconds === opt.value && (
                    <Text className="text-brand-950 text-xl">✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
