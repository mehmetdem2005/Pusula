import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Icon } from '../../src/components/ui/Icon'
import { useAuditLogs } from '../../src/hooks/useAdmin'

const ACTION_META: Record<string, { icon: string; color: string; label: string }> = {
  user_role_changed: { icon: 'shield', color: '#7C3AED', label: 'Rol değişti' },
  user_banned: { icon: 'lock', color: '#EF4444', label: 'Yasaklandı' },
  user_unbanned: { icon: 'unlock', color: '#10B981', label: 'Yasak kalktı' },
  library_uploaded: { icon: 'upload', color: '#1E1B4B', label: 'Kitap eklendi' },
  library_deleted: { icon: 'trash', color: '#EF4444', label: 'Kitap silindi' },
  suggested_subject_added: { icon: 'sparkles', color: '#F59E0B', label: 'Konu önerisi eklendi' },
}

export default function AdminAudit() {
  const { data, isLoading } = useAuditLogs(200)

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-cream-50" contentContainerStyle={{ padding: 16 }}>
      {(data?.logs ?? []).length === 0 && (
        <View className="items-center py-16">
          <Icon name="scroll-text" size={48} color="#CBD5E1" />
          <Text className="text-sm text-slate-500 mt-3">Henüz işlem yok</Text>
        </View>
      )}

      {(data?.logs ?? []).map((log) => {
        const meta = ACTION_META[log.action] ?? {
          icon: 'info',
          color: '#64748B',
          label: log.action,
        }
        const adminName = log.profiles?.full_name || log.profiles?.email?.split('@')[0] || 'Admin'

        return (
          <View
            key={log.id}
            className="bg-white border border-slate-100 rounded-xl p-3 mb-2 flex-row gap-3"
          >
            <View
              className="w-9 h-9 rounded-lg items-center justify-center"
              style={{ backgroundColor: `${meta.color}15` }}
            >
              <Icon name={meta.icon} size={16} color={meta.color} />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-ink-900">
                <Text className="font-semibold">{adminName}</Text>
                <Text className="text-slate-600"> · {meta.label.toLowerCase()}</Text>
              </Text>
              {Object.keys(log.metadata).length > 0 && (
                <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={2}>
                  {Object.entries(log.metadata)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ')}
                </Text>
              )}
              <Text className="text-[10px] text-slate-400 mt-0.5">
                {new Date(log.created_at).toLocaleString('tr-TR')}
              </Text>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}
