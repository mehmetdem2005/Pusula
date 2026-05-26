import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Button } from '../../../src/components/ui/Button'
import { Icon } from '../../../src/components/ui/Icon'
import {
  useAdminUser,
  useBanUser,
  useIsSuperAdmin,
  usePromoteUser,
  useUnbanUser,
} from '../../../src/hooks/useAdmin'

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = useAdminUser(id ?? null)
  const isSuperAdmin = useIsSuperAdmin()
  const promote = usePromoteUser()
  const ban = useBanUser()
  const unban = useUnbanUser()

  if (isLoading || !data) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  const { profile, stats } = data
  const initial = (profile.full_name ?? profile.email).charAt(0).toUpperCase()
  const sub = profile.subscriptions?.[0]

  const handlePromote = (newRole: 'user' | 'admin' | 'super_admin') => {
    Alert.alert('Rol değiştir', `${profile.email} → ${newRole}?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () =>
          promote.mutate(
            { userId: profile.id, newRole },
            { onError: (e: any) => Alert.alert('Hata', e.message) },
          ),
      },
    ])
  }

  const handleBan = () => {
    Alert.prompt('Yasakla', 'Yasaklama nedeni', (reason) => {
      if (!reason) return
      ban.mutate(
        { userId: profile.id, reason },
        { onError: (e: any) => Alert.alert('Hata', e.message) },
      )
    })
  }

  return (
    <ScrollView className="flex-1 bg-cream-50" contentContainerStyle={{ padding: 16 }}>
      {/* Avatar header */}
      <View className="bg-white border border-slate-100 rounded-3xl p-6 items-center mb-3">
        <View
          className="w-20 h-20 rounded-full items-center justify-center"
          style={{
            backgroundColor:
              profile.role === 'super_admin'
                ? '#F59E0B'
                : profile.role === 'admin'
                  ? '#1E1B4B'
                  : '#E2E8F0',
          }}
        >
          <Text
            className="font-serif text-4xl"
            style={{
              color:
                profile.role === 'super_admin'
                  ? '#1E1B4B'
                  : profile.role === 'admin'
                    ? '#FBF8F0'
                    : '#475569',
              fontStyle: 'italic',
            }}
          >
            {initial}
          </Text>
        </View>
        <Text className="font-serif text-2xl text-ink-900 mt-3">
          {profile.full_name || profile.email.split('@')[0]}
        </Text>
        <Text className="text-xs text-slate-500 mt-0.5">{profile.email}</Text>

        <View className="flex-row gap-2 mt-3 flex-wrap justify-center">
          {profile.role === 'super_admin' && (
            <View className="bg-amber-500 px-2 py-1 rounded">
              <Text className="text-[10px] text-ink-900 font-bold">SUPER ADMIN</Text>
            </View>
          )}
          {profile.role === 'admin' && (
            <View className="bg-ink-900 px-2 py-1 rounded">
              <Text className="text-[10px] text-cream-50 font-bold">ADMIN</Text>
            </View>
          )}
          {sub &&
            ['pro_monthly', 'pro_yearly', 'pro_lifetime'].includes(sub.tier) &&
            sub.status === 'active' && (
              <View className="bg-amber-50 border border-amber-300 px-2 py-1 rounded flex-row items-center gap-1">
                <Icon name="crown" size={10} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-[10px] text-amber-700 font-bold">
                  PRO {sub.tier.split('_')[1]?.toUpperCase()}
                </Text>
              </View>
            )}
          {profile.banned_at && (
            <View className="bg-red-500 px-2 py-1 rounded">
              <Text className="text-[10px] text-white font-bold">YASAKLI</Text>
            </View>
          )}
        </View>

        {profile.banned_at && profile.ban_reason && (
          <View className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 w-full">
            <Text className="text-xs text-red-700">Yasaklama nedeni:</Text>
            <Text className="text-sm text-red-900 mt-1">{profile.ban_reason}</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
        İstatistikler
      </Text>
      <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
        <View className="flex-row gap-3">
          <Stat label="Ders" value={stats.totalLessons} />
          <Stat label="Konu" value={stats.totalSubjects} />
          <Stat label="PDF" value={stats.totalPdfs} />
        </View>
        <View className="flex-row gap-3 mt-3">
          <Stat label="Şu anki seri" value={stats.currentStreak} unit="gün" />
          <Stat label="En uzun seri" value={stats.longestStreak} unit="gün" />
        </View>
      </View>

      {/* Auth providers */}
      <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
        Kimlik
      </Text>
      <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 gap-2">
        <Row label="E-posta" value={profile.email} verified />
        {profile.phone_number && (
          <Row
            label="Telefon"
            value={profile.phone_number}
            verified={!!profile.phone_verified_at}
          />
        )}
        <Row label="Kayıt" value={new Date(profile.created_at).toLocaleDateString('tr-TR')} />
        {(profile.auth_providers ?? []).length > 0 && (
          <Row label="Sağlayıcılar" value={(profile.auth_providers ?? []).join(', ')} />
        )}
      </View>

      {/* Actions */}
      {isSuperAdmin && (
        <>
          <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
            Yönetim
          </Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-2">
            <Text className="text-xs text-slate-500 mb-1">Rol değiştir:</Text>
            <View className="flex-row gap-2 mb-3">
              {(['user', 'admin', 'super_admin'] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => handlePromote(r)}
                  disabled={profile.role === r || promote.isPending}
                  className={`flex-1 py-2 rounded-lg border ${
                    profile.role === r ? 'bg-ink-900 border-ink-900' : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-center text-xs font-semibold ${
                      profile.role === r ? 'text-cream-50' : 'text-slate-700'
                    }`}
                  >
                    {r === 'user' ? 'Kullanıcı' : r === 'admin' ? 'Admin' : 'Super'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {profile.banned_at ? (
              <Button
                title="Yasağı Kaldır"
                variant="secondary"
                onPress={() => unban.mutate(profile.id)}
                loading={unban.isPending}
                fullWidth
              />
            ) : profile.role !== 'super_admin' ? (
              <Pressable
                onPress={handleBan}
                disabled={ban.isPending}
                className="bg-red-50 border border-red-200 rounded-xl py-3 items-center"
              >
                <Text className="text-red-700 font-semibold text-sm">Kullanıcıyı Yasakla</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  )
}

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</Text>
      <Text className="font-serif text-2xl text-ink-900 mt-1" style={{ fontStyle: 'italic' }}>
        {value}
        {unit && <Text className="text-xs text-slate-500"> {unit}</Text>}
      </Text>
    </View>
  )
}

function Row({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-xs text-slate-500">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-sm text-ink-900 font-medium">{value}</Text>
        {verified && <Icon name="check-circle" size={14} color="#10B981" />}
      </View>
    </View>
  )
}
