import * as AppleAuth from 'expo-apple-authentication'
import { Link, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Icon } from '../../src/components/ui/Icon'
import { Input } from '../../src/components/ui/Input'
import { supabase } from '../../src/lib/supabase'

/**
 * Sign In Screen — Tüm Auth Provider'lar
 *
 * Sıralama (UX araştırması: en kullanışlı önde):
 *   1. Magic Link (email)
 *   2. Email + Şifre (toggle)
 *   3. Telefon SMS
 *   4. Google
 *   5. Apple (iOS only)
 *   6. Facebook (Instagram dahil — Meta auth)
 */
export default function SignIn() {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState<'magic' | 'password' | 'phone'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [appleAvailable, setAppleAvailable] = useState(false)

  // Apple Sign In available?
  useState(() => {
    AppleAuth.isAvailableAsync().then(setAppleAvailable)
  })

  const handleMagicLink = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return Alert.alert('Geçersiz e-posta')
    }
    setLoading('magic')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: 'kavra://auth/callback' },
      })
      if (error) throw error
      Alert.alert('Magic link gönderildi', 'E-postana gelen linke tıkla.')
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(null)
    }
  }

  const handlePassword = async () => {
    setLoading('password')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (e: any) {
      if (e.message?.includes('Invalid')) {
        Alert.alert('Hatalı bilgiler', 'E-posta veya şifre yanlış. Şifremi unuttum?', [
          { text: 'Tekrar dene', style: 'cancel' },
          {
            text: 'Şifremi unuttum',
            onPress: () => router.push({ pathname: '/(auth)/reset-password', params: { email } }),
          },
        ])
      } else {
        Alert.alert('Hata', e.message)
      }
    } finally {
      setLoading(null)
    }
  }

  const handlePhone = async () => {
    if (!phone.match(/^\+?[1-9]\d{9,14}$/)) {
      return Alert.alert('Geçersiz numara', '+905XX XXX XX XX formatında gir')
    }
    setLoading('phone')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+90${phone}`,
      })
      if (error) throw error
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { identifier: phone, type: 'phone', purpose: 'login' },
      })
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(null)
    }
  }

  const handleGoogle = async () => {
    setLoading('google')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'kavra://auth/callback' },
      })
      if (error) throw error
      if (data.url) await WebBrowser.openAuthSessionAsync(data.url, 'kavra://')
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(null)
    }
  }

  const handleApple = async () => {
    setLoading('apple')
    try {
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        })
        if (error) throw error
      }
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') Alert.alert('Hata', e.message)
    } finally {
      setLoading(null)
    }
  }

  const handleFacebook = async () => {
    setLoading('facebook')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: 'kavra://auth/callback',
          scopes: 'email,public_profile',
        },
      })
      if (error) throw error
      if (data.url) await WebBrowser.openAuthSessionAsync(data.url, 'kavra://')
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 48 }}>
        {/* Brand */}
        <View className="mb-12">
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
            Hoşgeldin
          </Text>
          <Text className="font-serif text-4xl text-ink-900 leading-tight">
            Bugün <Text className="text-amber-500 italic">ne</Text>
            {'\n'}kavramak istersin?
          </Text>
        </View>

        {/* Method tabs */}
        <View className="flex-row gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
          {[
            { key: 'magic', label: 'Magic Link' },
            { key: 'password', label: 'Şifre' },
            { key: 'phone', label: 'Telefon' },
          ].map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setAuthMethod(m.key as any)}
              className={`flex-1 py-2 rounded-lg ${authMethod === m.key ? 'bg-white' : ''}`}
            >
              <Text
                className={`text-center text-xs font-semibold ${authMethod === m.key ? 'text-ink-900' : 'text-slate-500'}`}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Active method form */}
        {authMethod === 'magic' && (
          <View className="gap-3">
            <Input
              label="E-POSTA"
              value={email}
              onChangeText={setEmail}
              placeholder="eda@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              title="Magic Link Gönder"
              onPress={handleMagicLink}
              loading={loading === 'magic'}
              icon="arrow-right"
              fullWidth
            />
            <Text className="text-xs text-slate-500 text-center mt-1">
              E-postana özel link gelir, tek tıkla giriş.
            </Text>
          </View>
        )}

        {authMethod === 'password' && (
          <View className="gap-3">
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
              placeholder="•••••••••"
              secureTextEntry
            />
            <Button
              title="Giriş Yap"
              onPress={handlePassword}
              loading={loading === 'password'}
              fullWidth
            />

            <View className="flex-row justify-between mt-1">
              <Link href="/(auth)/sign-up" asChild>
                <Pressable>
                  <Text className="text-xs text-ink-900 underline">Hesabım yok</Text>
                </Pressable>
              </Link>
              <Link href="/(auth)/reset-password" asChild>
                <Pressable>
                  <Text className="text-xs text-ink-900 underline">Şifremi unuttum</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        )}

        {authMethod === 'phone' && (
          <View className="gap-3">
            <Input
              label="TELEFON"
              value={phone}
              onChangeText={setPhone}
              placeholder="+90 5XX XXX XX XX"
              keyboardType="phone-pad"
            />
            <Button
              title="SMS ile Doğrulama Kodu Gönder"
              onPress={handlePhone}
              loading={loading === 'phone'}
              icon="message-circle"
              fullWidth
            />
            <Text className="text-xs text-slate-500 text-center">
              Numarana 6 haneli kod gönderilir. Şifre gerekmez.
            </Text>
          </View>
        )}

        {/* Divider */}
        <View className="flex-row items-center gap-3 my-6">
          <View className="flex-1 h-[1px] bg-slate-200" />
          <Text className="text-xs text-slate-400">veya</Text>
          <View className="flex-1 h-[1px] bg-slate-200" />
        </View>

        {/* OAuth providers */}
        <View className="gap-2">
          <Pressable
            onPress={handleGoogle}
            disabled={!!loading}
            className="bg-white border border-slate-200 rounded-xl p-3 flex-row items-center justify-center gap-3"
          >
            {loading === 'google' ? (
              <ActivityIndicator color="#1E1B4B" />
            ) : (
              <>
                <Image
                  source={{
                    uri: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
                  }}
                  style={{ width: 18, height: 18 }}
                />
                <Text className="text-ink-900 font-medium text-sm">Google ile devam et</Text>
              </>
            )}
          </Pressable>

          {appleAvailable && (
            <Pressable
              onPress={handleApple}
              disabled={!!loading}
              className="bg-black rounded-xl p-3 flex-row items-center justify-center gap-3"
            >
              {loading === 'apple' ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Icon name="apple" size={18} color="white" />
                  <Text className="text-white font-medium text-sm">Apple ile devam et</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            onPress={handleFacebook}
            disabled={!!loading}
            className="bg-[#1877F2] rounded-xl p-3 flex-row items-center justify-center gap-3"
          >
            {loading === 'facebook' ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="facebook" size={18} color="white" />
                <Text className="text-white font-medium text-sm">
                  Facebook / Instagram ile devam et
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <Text className="text-[10px] text-slate-500 text-center mt-8 leading-5">
          Devam ederek <Text className="text-ink-900 underline">Kullanım Şartları</Text> ve{'\n'}
          <Text className="text-ink-900 underline">Gizlilik Politikası</Text>'nı kabul ediyorsun.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
