import { Link } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { signInWithGoogle } from '../../src/lib/google-auth'
import { useAuth } from '../../src/stores/auth'

export default function SignIn() {
  const { t } = useTranslation()
  const signIn = useAuth((s) => s.signIn)
  const magicLink = useAuth((s) => s.signInWithMagicLink)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('', t('auth.errors.invalidCredentials'))
      return
    }
    setLoading(true)
    const res = await signIn(email, password)
    setLoading(false)
    if (res.error) Alert.alert('', res.error)
  }

  const handleMagicLink = async () => {
    if (!email) {
      Alert.alert('', t('auth.signin.email'))
      return
    }
    setMagicLoading(true)
    const res = await magicLink(email)
    setMagicLoading(false)
    if (res.error) Alert.alert('', res.error)
    else Alert.alert('', t('auth.magicLinkSent'))
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const res = await signInWithGoogle()
    setGoogleLoading(false)
    if (res.error && res.error !== 'Giriş iptal edildi') {
      Alert.alert('Google Sign-In', res.error)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-brand-950 rounded-2xl items-center justify-center mb-4">
              <Text className="text-white text-4xl font-serif">K</Text>
            </View>
            <Text className="text-4xl font-serif text-brand-950">Kavra</Text>
            <View className="w-16 h-0.5 bg-accent-500 mt-1" />
          </View>

          <Text className="text-2xl font-serif text-brand-950 mb-1">{t('auth.signin.title')}</Text>
          <Text className="text-base text-slate-600 mb-8">{t('auth.signin.subtitle')}</Text>

          <Input
            label={t('auth.signin.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <Input
            label={t('auth.signin.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Button
            title={t('auth.signin.submit')}
            onPress={handleSignIn}
            loading={loading}
            fullWidth
            size="lg"
          />

          <Pressable onPress={handleMagicLink} className="py-3 items-center mt-3">
            <Text className="text-brand-600">
              {magicLoading ? '...' : t('auth.signin.magicLink')}
            </Text>
          </Pressable>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-slate-200" />
            <Text className="mx-3 text-xs text-slate-400">— veya —</Text>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={googleLoading}
            className="h-14 border border-slate-200 rounded-xl bg-white flex-row items-center justify-center gap-3 active:bg-slate-50"
          >
            <Text style={{ fontSize: 20 }}>🔵</Text>
            <Text className="text-brand-950 font-semibold text-base">
              {googleLoading ? 'Bağlanıyor...' : t('auth.signin.google')}
            </Text>
          </Pressable>

          <View className="flex-row justify-center mt-8">
            <Text className="text-slate-600">{t('auth.signin.noAccount')} </Text>
            <Link href="/(auth)/signup" className="text-brand-600 font-semibold">
              {t('auth.signin.signupCta')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
