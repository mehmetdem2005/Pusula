import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { type AdminUser, useAdminUsers } from '../../src/hooks/useAdmin'

export default function AdminUsers() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | undefined>()

  const { data, isLoading } = useAdminUsers({ search, role: roleFilter })

  return (
    <View className="flex-1 bg-cream-50">
      <View className="px-5 py-4 bg-white border-b border-slate-100">
        <View className="flex-row items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
          <Icon name="search" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="E-posta veya isim ara..."
            placeholderTextColor="#94A3B8"
            className="flex-1 text-sm text-ink-900"
          />
        </View>

        {/* Role filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-2">
            {[
              { v: undefined, l: 'Tümü' },
              { v: 'super_admin', l: 'Super Admin' },
              { v: 'admin', l: 'Admin' },
              { v: 'user', l: 'Kullanıcı' },
            ].map((f) => (
              <Pressable
                key={f.l}
                onPress={() => setRoleFilter(f.v)}
                className={`px-3 py-1.5 rounded-full ${roleFilter === f.v ? 'bg-ink-900' : 'bg-slate-100'}`}
              >
                <Text
                  className={`text-xs font-semibold ${roleFilter === f.v ? 'text-cream-50' : 'text-slate-600'}`}
                >
                  {f.l}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E1B4B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {data?.total === 0 && (
            <View className="items-center py-12">
              <Icon name="user" size={40} color="#CBD5E1" />
              <Text className="text-slate-500 mt-3">Kullanıcı bulunamadı</Text>
            </View>
          )}

          {(data?.users ?? []).map((u) => (
            <UserRow key={u.id} user={u} onPress={() => router.push(`/(admin)/users/${u.id}`)} />
          ))}

          {data && data.total > data.users.length && (
            <Text className="text-center text-xs text-slate-500 mt-4">
              {data.users.length} / {data.total}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  )
}

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const initial = (user.full_name ?? user.email).charAt(0).toUpperCase()
  const sub = user.subscriptions?.[0]
  const isPro =
    sub &&
    ['pro_monthly', 'pro_yearly', 'pro_lifetime'].includes(sub.tier) &&
    sub.status === 'active'

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl p-3 mb-2 flex-row items-center gap-3"
    >
      <View
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{
          backgroundColor:
            user.role === 'super_admin' ? '#F59E0B' : user.role === 'admin' ? '#1E1B4B' : '#E2E8F0',
        }}
      >
        <Text
          className="font-serif text-lg"
          style={{
            color:
              user.role === 'super_admin'
                ? '#1E1B4B'
                : user.role === 'admin'
                  ? '#FBF8F0'
                  : '#475569',
            fontStyle: 'italic',
          }}
        >
          {initial}
        </Text>
      </View>

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Text className="font-semibold text-ink-900 text-sm" numberOfLines={1}>
            {user.full_name || user.email.split('@')[0]}
          </Text>
          {user.role === 'super_admin' && (
            <View className="bg-amber-500 px-1.5 py-0.5 rounded">
              <Text className="text-[8px] text-ink-900 font-bold">SUPER</Text>
            </View>
          )}
          {user.role === 'admin' && (
            <View className="bg-ink-900 px-1.5 py-0.5 rounded">
              <Text className="text-[8px] text-cream-50 font-bold">ADMIN</Text>
            </View>
          )}
          {isPro && <Icon name="crown" size={12} color="#F59E0B" fill="#F59E0B" />}
          {user.banned_at && (
            <View className="bg-red-500 px-1.5 py-0.5 rounded">
              <Text className="text-[8px] text-white font-bold">YASAKLI</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-slate-500" numberOfLines={1}>
          {user.email}
        </Text>
        <View className="flex-row gap-2 mt-0.5">
          {user.phone_verified_at && <Icon name="phone" size={10} color="#10B981" />}
          {(user.auth_providers ?? []).slice(0, 3).map((p, i) => (
            <Text key={i} className="text-[9px] text-slate-400">
              {p}
            </Text>
          ))}
        </View>
      </View>

      <Icon name="chevron-right" size={18} color="#CBD5E1" />
    </Pressable>
  )
}
