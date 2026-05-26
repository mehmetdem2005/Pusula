import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { apiFetch } from '../../src/lib/api'

export default function ResetPassword() {
  const router = useRouter()
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(params.email ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return Alert.alert('Geçersiz e-posta')
    }

    setLoading(true)
    try {
      await apiFetch('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          identifier: email,
          identifierType: 'email',
          purpose: 'password_reset',
        }),
      })

      router.push({
        pathname: '/(auth)/verify-otp',
        params: { identifier: email, type: 'email', purpose: 'password_reset' },
      })
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{ title: 'Şifremi Unuttum', headerStyle: { backgroundColor: '#FBF8F0' } }}
      />
      <View className="flex-1 px-6 pt-8">
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
          Sıfırla
        </Text>
        <Text className="font-serif text-3xl text-ink-900 leading-tight mb-3">
          Şifreni <Text className="text-amber-500 italic">unuttuysan</Text>
        </Text>
        <Text className="text-sm text-slate-600 mb-8 leading-5">
          E-posta adresini gir, sıfırlama kodunu yollayalım. Kod 10 dakika geçerli olur.
        </Text>

        <Input
          label="E-POSTA"
          value={email}
          onChangeText={setEmail}
          placeholder="eda@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View className="mt-4">
          <Button
            title="Sıfırlama Kodu Gönder"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  )
}
