import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { apiFetch } from '../../lib/api'
import { Icon, type IconName } from '../ui/Icon'

interface Announcement {
  id: string
  title: string
  message: string
  cta_label: string | null
  cta_url: string | null
  level: 'info' | 'feature' | 'maintenance' | 'critical'
}

const LEVEL_STYLES: Record<
  string,
  { bg: string; border: string; text: string; icon: IconName; iconColor: string }
> = {
  info: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-900',
    icon: 'info',
    iconColor: '#0891B2',
  },
  feature: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: 'sparkles',
    iconColor: '#F59E0B',
  },
  maintenance: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-900',
    icon: 'settings',
    iconColor: '#64748B',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-900',
    icon: 'alert-triangle',
    iconColor: '#DC2626',
  },
}

export function AnnouncementBanner() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiFetch<{ announcements: Announcement[] }>('/api/announcements'),
    staleTime: 10 * 60 * 1000, // 10 dk
  })

  const dismissMut = useMutation({
    mutationFn: (input: { id: string; clicked: boolean }) =>
      apiFetch(`/api/announcements/${input.id}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ clicked: input.clicked }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const announcement = data?.announcements?.[0]
  if (!announcement) return null

  const style = LEVEL_STYLES[announcement.level] ?? LEVEL_STYLES.info

  const handleClick = () => {
    if (announcement.cta_url) {
      if (announcement.cta_url.startsWith('http')) {
        Linking.openURL(announcement.cta_url)
      } else {
        router.push(announcement.cta_url as any)
      }
      dismissMut.mutate({ id: announcement.id, clicked: true })
    }
  }

  return (
    <View className={`mx-4 mt-3 rounded-2xl border ${style.bg} ${style.border} p-3`}>
      <View className="flex-row items-start gap-2">
        <Icon name={style.icon} size={18} color={style.iconColor} />
        <View className="flex-1">
          <Text className={`font-semibold text-sm ${style.text}`}>{announcement.title}</Text>
          <Text className={`text-xs ${style.text} opacity-80 mt-0.5`}>{announcement.message}</Text>
          {announcement.cta_label && announcement.cta_url && (
            <Pressable onPress={handleClick} className="mt-2">
              <Text className={`text-xs font-bold ${style.text}`}>{announcement.cta_label} →</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => dismissMut.mutate({ id: announcement.id, clicked: false })}
          hitSlop={8}
        >
          <Icon name="x" size={14} color={style.iconColor} />
        </Pressable>
      </View>
    </View>
  )
}
