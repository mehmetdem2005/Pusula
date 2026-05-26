import { Link } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { useAuth } from '../../src/stores/auth'

export default function SignUp() {
  const { t } = useTranslation()
  const signUp = useAuth((s) => s.signUp)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('', 'Tüm alanları doldur')
      return
    }
    if (password.length < 8) {
      Alert.alert('', t('auth.errors.weakPassword'))
      return
    }
    setLoading(true)
    const res = await signUp(email, password, fullName)
    setLoading(false)
    if (res.error) Alert.alert('', res.error)
    else Alert.alert('', t('auth.magicLinkSent'))
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
          <View className="items-center mb-10">
            <View className="w-16 h-16 bg-brand-950 rounded-2xl items-center justify-center">
              <Text className="text-white text-3xl font-serif">K</Text>
            </View>
          </View>

          <Text className="text-3xl font-serif text-brand-950 mb-1">{t('auth.signup.title')}</Text>
          <Text className="text-base text-slate-600 mb-8">{t('auth.signup.subtitle')}</Text>

          <Input
            label={t('auth.signup.fullName')}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
          />
          <Input
            label={t('auth.signup.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
          <Input
            label={t('auth.signup.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            hint={t('auth.signup.passwordHint')}
          />

          <Button
            title={t('auth.signup.submit')}
            onPress={handleSignUp}
            loading={loading}
            fullWidth
            size="lg"
          />

          <Text className="text-xs text-slate-500 text-center mt-4 leading-4">
            {t('auth.signup.terms')}
          </Text>

          <View className="flex-row justify-center mt-8">
            <Text className="text-slate-600">{t('auth.signup.haveAccount')} </Text>
            <Link href="/(auth)/signin" className="text-brand-600 font-semibold">
              {t('auth.signup.signinCta')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
