import { useLocalSearchParams, useRouter } from 'expo-router'
import { Stack } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, Keyboard, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { apiFetch } from '../../src/lib/api'

/**
 * OTP Verify Screen
 * 6 haneli kod inputu — auto-focus next, paste full code support
 */
export default function VerifyOTP() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    identifier: string
    type: 'phone' | 'email'
    purpose: string
  }>()

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [resendable, setResendable] = useState(false)
  const inputs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    // Geri sayım
    if (secondsLeft > 0) {
      const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
      return () => clearTimeout(t)
    }
    setResendable(true)
    return
  }, [secondsLeft])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const updateDigit = (idx: number, val: string) => {
    // Paste full 6-digit code
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      const arr = val.split('')
      setDigits(arr)
      Keyboard.dismiss()
      submit(arr.join(''))
      return
    }

    const sanitized = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = sanitized
    setDigits(next)

    if (sanitized && idx < 5) {
      inputs.current[idx + 1]?.focus()
    }
    if (next.every((d) => d.length === 1) && idx === 5) {
      Keyboard.dismiss()
      submit(next.join(''))
    }
  }

  const handleBackspace = (idx: number) => {
    if (!digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
      const next = [...digits]
      next[idx - 1] = ''
      setDigits(next)
    }
  }

  const submit = async (code: string) => {
    setLoading(true)
    try {
      const result = await apiFetch<{ ok: boolean; resetToken?: string }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          identifier: params.identifier,
          identifierType: params.type,
          code,
          purpose: params.purpose,
        }),
      })

      if (result.ok) {
        if (params.purpose === 'password_reset') {
          router.replace({
            pathname: '/(auth)/new-password',
            params: { email: params.identifier, resetToken: result.resetToken },
          })
        } else if (params.purpose === 'phone_verify') {
          Alert.alert('✓ Doğrulandı', 'Telefonun doğrulandı.', [
            { text: 'Tamam', onPress: () => router.back() },
          ])
        } else {
          router.replace('/(tabs)')
        }
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Kod yanlış')
      setDigits(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!resendable) return
    try {
      await apiFetch('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          identifier: params.identifier,
          identifierType: params.type,
          purpose: params.purpose,
        }),
      })
      setSecondsLeft(60)
      setResendable(false)
      Alert.alert('Kod gönderildi', 'Yeni kod gönderildi')
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
  }

  const masked =
    params.type === 'email'
      ? params.identifier?.replace(/^(.{2}).+(@.+)$/, '$1•••$2')
      : params.identifier?.replace(/(\+?\d{2,3})(.+)(\d{2})$/, '$1•••$3')

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-6 pt-12">
        <Pressable onPress={() => router.back()} className="mb-8">
          <Text className="text-2xl text-ink-900">‹</Text>
        </Pressable>

        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
          Doğrulama
        </Text>
        <Text className="font-serif text-3xl text-ink-900 leading-tight mb-3">
          6 haneli kodu <Text className="text-amber-500 italic">gir</Text>
        </Text>
        <Text className="text-sm text-slate-600 mb-12">
          {params.type === 'email' ? '✉️' : '📱'} {masked} adresine kod gönderdik.
        </Text>

        {/* 6 input */}
        <View className="flex-row justify-between gap-2 mb-8">
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                inputs.current[i] = r
              }}
              value={d}
              onChangeText={(v) => updateDigit(i, v)}
              onKeyPress={(e) => {
                if (e.nativeEvent.key === 'Backspace') handleBackspace(i)
              }}
              keyboardType="number-pad"
              maxLength={i === 0 ? 6 : 1}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              className="flex-1 h-16 bg-white border border-slate-200 rounded-2xl text-center text-3xl font-mono text-ink-900"
            />
          ))}
        </View>

        <Button
          title={loading ? 'Doğrulanıyor...' : 'Doğrula'}
          onPress={() => submit(digits.join(''))}
          disabled={digits.some((d) => !d) || loading}
          loading={loading}
          fullWidth
        />

        <View className="mt-8 items-center">
          <Pressable onPress={handleResend} disabled={!resendable}>
            <Text className={`text-sm ${resendable ? 'text-ink-900 underline' : 'text-slate-400'}`}>
              {resendable ? 'Kodu yeniden gönder' : `Yeniden gönder · ${secondsLeft}s`}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}
