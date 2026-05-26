import { Link, Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { supabase } from '../../src/lib/supabase'

export default function SignUp() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!fullName.trim()) return Alert.alert('İsmini gir')
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return Alert.alert('Geçersiz e-posta')
    if (password.length < 8) return Alert.alert('Şifre en az 8 karakter')

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: 'kavra://auth/callback',
        },
      })

      if (error) throw error

      if (data.session) {
        // E-posta doğrulaması kapalı, direkt giriş
        router.replace('/(tabs)')
      } else {
        // E-posta doğrulaması açık
        Alert.alert(
          '✓ Kaydın oluşturuldu',
          'E-postana doğrulama linki gönderdik. Linke tıkla, sonra giriş yap.',
          [{ text: 'Tamam', onPress: () => router.replace('/(auth)/sign-in') }],
        )
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{ title: 'Hesap Oluştur', headerStyle: { backgroundColor: '#FBF8F0' } }}
      />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8 }}>
        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
          Yeni Hesap
        </Text>
        <Text className="font-serif text-3xl text-ink-900 leading-tight mb-3">
          Kavra'ya <Text className="text-amber-500 italic">hoşgeldin</Text>
        </Text>
        <Text className="text-sm text-slate-600 mb-8 leading-5">
          E-postanı doğrula, kişisel öğrenme yolculuğun başlasın.
        </Text>

        <View className="gap-3">
          <Input
            label="İSMİN"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Eda Yılmaz"
            autoCapitalize="words"
          />
          <Input
            label="E-POSTA"
            value={email}
            onChangeText={setEmail}
            placeholder="eda@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="ŞİFRE"
            value={password}
            onChangeText={setPassword}
            placeholder="En az 8 karakter"
            secureTextEntry
          />

          <View className="mt-4">
            <Button title="Hesap Oluştur" onPress={handleSubmit} loading={loading} fullWidth />
          </View>
        </View>

        <View className="mt-6 items-center">
          <Link href="/(auth)/sign-in" asChild>
            <Text className="text-sm text-ink-900 underline">Hesabım var, giriş yap</Text>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
