import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { useAdminDashboard, useMyRole } from '../../src/hooks/useAdmin'

export default function AdminDashboard() {
  const router = useRouter()
  const { data, isLoading } = useAdminDashboard()
  const { data: role } = useMyRole()

  return (
    <ScrollView className="flex-1 bg-cream-50">
      <SafeAreaView edges={['bottom']}>
        <View className="px-6 py-6">
          {/* Hero */}
          <View
            className="bg-ink-950 rounded-3xl p-6 mb-4 overflow-hidden"
            style={{ position: 'relative' }}
          >
            <View
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 140,
                height: 140,
                backgroundColor: '#F59E0B33',
                borderRadius: 70,
              }}
            />
            <View className="flex-row items-center gap-2 mb-2">
              <Icon name="shield" size={20} color="#F59E0B" />
              <Text className="font-mono text-[10px] text-amber-500 tracking-widest uppercase">
                {role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Text>
            </View>
            <Text className="font-serif text-3xl text-cream-50 leading-tight">
              Yönetim <Text className="text-amber-500 italic">paneli</Text>
            </Text>
            <Text className="text-sm text-cream-50/70 mt-2">Kavra'nın iç işleri.</Text>
          </View>

          {/* Stats */}
          {isLoading ? (
            <ActivityIndicator color="#1E1B4B" />
          ) : data ? (
            <>
              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                Kullanıcılar
              </Text>
              <View className="flex-row gap-2 mb-4">
                <StatCard label="Toplam" value={data.users.total} />
                <StatCard label="Bu Hafta" value={data.users.newThisWeek} accent="#10B981" />
                <StatCard label="Pro" value={data.users.proCount} accent="#F59E0B" />
              </View>

              <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                İçerik
              </Text>
              <View className="flex-row gap-2 mb-6">
                <StatCard label="Kullanıcı PDF" value={data.content.userPdfs} />
                <StatCard label="Kütüphane" value={data.content.libraryBooks} accent="#7C3AED" />
                <StatCard label="Toplam Ders" value={data.content.totalLessons} />
              </View>
            </>
          ) : null}

          {/* Actions */}
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
            İşlemler
          </Text>
          <View className="gap-2">
            <ActionRow
              icon="user"
              title="Kullanıcılar"
              desc="Liste, rol değiştir, yasakla"
              onPress={() => router.push('/(admin)/users')}
            />
            <ActionRow
              icon="library"
              title="Kütüphane"
              desc="Kitap & PDF yükle, sil"
              onPress={() => router.push('/(admin)/library')}
            />
            <ActionRow
              icon="scroll-text"
              title="İşlem Geçmişi"
              desc="Audit log — tüm admin aksiyonları"
              onPress={() => router.push('/(admin)/audit')}
            />
            <ActionRow
              icon="sparkles"
              title="Önerilen Konular"
              desc="Onboarding'de gösterilecek dersler"
              onPress={() => router.push('/(admin)/suggested-subjects')}
            />
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  )
}

function StatCard({
  label,
  value,
  accent = '#1E1B4B',
}: { label: string; value: number; accent?: string }) {
  return (
    <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3">
      <Text className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</Text>
      <Text className="font-serif text-3xl mt-1" style={{ color: accent, fontStyle: 'italic' }}>
        {value}
      </Text>
    </View>
  )
}

function ActionRow({
  icon,
  title,
  desc,
  onPress,
}: { icon: string; title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl p-4 flex-row items-center gap-3"
    >
      <View className="w-10 h-10 bg-ink-950 rounded-xl items-center justify-center">
        <Icon name={icon} size={20} color="#F59E0B" />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-ink-900">{title}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{desc}</Text>
      </View>
      <Icon name="chevron-right" size={18} color="#CBD5E1" />
    </Pressable>
  )
}
