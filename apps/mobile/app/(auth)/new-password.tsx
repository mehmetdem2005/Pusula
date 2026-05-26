import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { apiFetch } from '../../src/lib/api'

export default function NewPassword() {
  const router = useRouter()
  const params = useLocalSearchParams<{ email: string; resetToken: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (password.length < 8) return Alert.alert('Çok kısa', 'Şifre en az 8 karakter olmalı')
    if (password !== confirm) return Alert.alert('Eşleşmiyor', 'Şifreler aynı değil')

    setLoading(true)
    try {
      await apiFetch('/api/auth/password-reset/complete', {
        method: 'POST',
        body: JSON.stringify({
          email: params.email,
          code: params.resetToken,
          newPassword: password,
        }),
      })

      Alert.alert('✓ Şifren güncellendi', 'Yeni şifrenle giriş yapabilirsin.', [
        { text: 'Tamam', onPress: () => router.replace('/(auth)/sign-in') },
      ])
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
    }
  }

  const strength =
    password.length >= 12
      ? 'strong'
      : password.length >= 8
        ? 'medium'
        : password.length > 0
          ? 'weak'
          : 'empty'

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{ title: 'Yeni Şifre', headerStyle: { backgroundColor: '#FBF8F0' } }}
      />
      <View className="flex-1 px-6 pt-8">
        <Text className="font-serif text-3xl text-ink-900 leading-tight mb-3">
          Yeni <Text className="text-amber-500 italic">şifren</Text>
        </Text>
        <Text className="text-sm text-slate-600 mb-8">En az 8 karakter. Güçlü şifre seç.</Text>

        <View className="gap-3">
          <Input
            label="YENİ ŞİFRE"
            value={password}
            onChangeText={setPassword}
            placeholder="•••••••••••"
            secureTextEntry
          />

          {strength !== 'empty' && (
            <View className="flex-row gap-1">
              <View
                className={`flex-1 h-1 rounded-full ${strength === 'weak' ? 'bg-red-400' : strength === 'medium' ? 'bg-amber-400' : 'bg-green-500'}`}
              />
              <View
                className={`flex-1 h-1 rounded-full ${strength === 'medium' ? 'bg-amber-400' : strength === 'strong' ? 'bg-green-500' : 'bg-slate-200'}`}
              />
              <View
                className={`flex-1 h-1 rounded-full ${strength === 'strong' ? 'bg-green-500' : 'bg-slate-200'}`}
              />
            </View>
          )}

          <Input
            label="TEKRAR"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="•••••••••••"
            secureTextEntry
          />

          <View className="mt-4">
            <Button title="Şifremi Güncelle" onPress={handleSubmit} loading={loading} fullWidth />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
