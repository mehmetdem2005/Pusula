import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMyRole } from '../../src/hooks/useAdmin'
import { useAuth } from '../../src/stores/auth'

export default function Profile() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? ''
  const initial = fullName.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'K'
  const { data: role } = useMyRole()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const confirmSignOut = () => {
    Alert.alert('', 'Çıkış yapmak istediğinden emin misin?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => signOut() },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <ScrollView className="flex-1">
        {/* Avatar + isim */}
        <View className="items-center pt-8 pb-6">
          <View className="w-20 h-20 rounded-full bg-brand-950 items-center justify-center mb-3">
            <Text className="text-white text-3xl font-serif">{initial}</Text>
          </View>
          <Text className="text-xl font-semibold text-brand-950">{fullName || 'Kavracı'}</Text>
          <Text className="text-slate-500 mt-0.5">{user?.email}</Text>
        </View>

        <View className="px-5 gap-2">
          <Section title="Kişiselleştirme">
            <Row
              emoji="🔑"
              title={t('profile.apiKeys')}
              onPress={() => router.push('/settings/api-keys')}
            />
            <Row emoji="🏆" title="Rozetlerim" onPress={() => router.push('/achievements')} />
            <Row emoji="🎯" title="Hedeflerim" onPress={() => router.push('/goals')} />
            <Row emoji="📊" title="Haftalık Rapor" onPress={() => router.push('/weekly-report')} />
            <Row
              emoji="🎭"
              title={t('profile.personalities')}
              onPress={() => Alert.alert('', 'Yakında')}
            />
            <Row
              emoji="🎙️"
              title={t('profile.voice')}
              onPress={() => router.push('/settings/voice')}
            />
            <Row
              emoji="🎤"
              title="Ses Klonlarım"
              onPress={() => router.push('/settings/voice-clones')}
            />
            <Row emoji="📖" title="Kitap Dağarcığım" onPress={() => router.push('/vocabulary')} />
            <Row emoji="🃏" title="Egzersizler" onPress={() => router.push('/exercises')} />
          </Section>

          <Section title="Uygulama">
            <Row emoji="🎨" title="Tema" onPress={() => router.push('/settings/theme')} />
            <Row emoji="🔒" title="App Lock" onPress={() => router.push('/settings/app-lock')} />
            <Row
              emoji="🌍"
              title={t('profile.language')}
              onPress={() => Alert.alert('', 'Yakında')}
            />
            <Row
              emoji="⚙️"
              title={t('profile.preferences')}
              onPress={() => Alert.alert('', 'Yakında')}
            />
          </Section>

          <Section title="Hesap">
            <Row emoji="👑" title="Pro Üyelik" onPress={() => router.push('/upgrade')} />
            <Row emoji="📦" title={t('profile.data')} onPress={() => Alert.alert('', 'Yakında')} />
            <Row
              emoji="ℹ️"
              title={t('profile.about')}
              onPress={() => Alert.alert('', 'Kavra v0.8.0')}
            />
          </Section>

          {isAdmin && (
            <Section title={role === 'super_admin' ? '⚡ Super Admin' : '⚡ Admin'}>
              <Row
                emoji="🛡️"
                title="Yönetim Paneli"
                onPress={() => router.push('/(admin)/dashboard')}
              />
            </Section>
          )}

          <Pressable
            onPress={confirmSignOut}
            className="bg-white rounded-2xl p-4 mt-4 mb-8 border border-red-100 items-center"
          >
            <Text className="text-red-500 font-semibold">{t('profile.signOut')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-xs font-semibold text-slate-400 uppercase mt-4 mb-2 px-1">{title}</Text>
      <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {children}
      </View>
    </View>
  )
}

function Row({ emoji, title, onPress }: { emoji: string; title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 active:bg-slate-50"
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text className="flex-1 text-brand-950">{title}</Text>
      <Text className="text-slate-400 text-xl">›</Text>
    </Pressable>
  )
}
