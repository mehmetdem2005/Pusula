import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { useMyRole } from '../../src/hooks/useAdmin'

export default function AdminLayout() {
  const { data: role, isLoading } = useMyRole()

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center p-8">
        <Icon name="shield" size={64} color="#94A3B8" />
        <Text className="font-serif text-2xl text-ink-900 mt-4 text-center">Erişim yok</Text>
        <Text className="text-sm text-slate-500 mt-2 text-center">
          Bu sayfa sadece adminler için.
        </Text>
        <View className="mt-4">
          <Redirect href="/(tabs)" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0F0E1F' },
        headerTitleStyle: { color: '#FBF8F0', fontFamily: 'InstrumentSerif-Italic' },
        headerTintColor: '#F59E0B',
        contentStyle: { backgroundColor: '#FBF8F0' },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Yönetim Paneli' }} />
      <Stack.Screen name="users" options={{ title: 'Kullanıcılar' }} />
      <Stack.Screen name="users/[id]" options={{ title: 'Kullanıcı Detay' }} />
      <Stack.Screen name="library" options={{ title: 'Kütüphane' }} />
      <Stack.Screen
        name="library/upload"
        options={{ title: 'Yeni Kitap', presentation: 'modal' }}
      />
      <Stack.Screen name="audit" options={{ title: 'İşlem Geçmişi' }} />
    </Stack>
  )
}
