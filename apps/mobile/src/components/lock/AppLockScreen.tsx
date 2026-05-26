import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { tryBiometricUnlock } from '../../hooks/useAppLock'

interface Props {
  visible: boolean
}

export function AppLockScreen({ visible }: Props) {
  useEffect(() => {
    if (visible) {
      // Otomatik biyometrik prompt aç
      const t = setTimeout(() => {
        tryBiometricUnlock()
      }, 300)
      return () => clearTimeout(t)
    }
    return
  }, [visible])

  if (!visible) return null

  return (
    <SafeAreaView
      className="absolute inset-0 z-50 bg-brand-950 items-center justify-center"
      style={{ width: '100%', height: '100%' }}
    >
      <View className="items-center">
        <Text style={{ fontSize: 80 }}>🔒</Text>
        <Text className="text-white text-3xl font-serif mt-6">Kavra Kilidi</Text>
        <Text className="text-white/70 text-base mt-2 text-center px-8">
          Devam etmek için kimliğini doğrula
        </Text>

        <Pressable
          onPress={() => tryBiometricUnlock()}
          className="mt-12 bg-white px-8 py-4 rounded-2xl flex-row items-center gap-2"
        >
          <Text style={{ fontSize: 22 }}>👆</Text>
          <Text className="text-brand-950 font-bold text-base">Kilidi Aç</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
