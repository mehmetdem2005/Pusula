import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { apiFetch } from '../lib/api'
import { useAuth } from '../stores/auth'

/**
 * Push Notifications + Device Registration
 * =========================================
 *
 * iOS / Android'de push notification için:
 *   1. expo-notifications ile permission iste
 *   2. Expo Push Token al (ExponentPushToken[xxx])
 *   3. Backend'e device kayıt et (deviceId + push_token)
 *
 * Android channel (Pomodoro, Reviews, vb. ayrı kanallar gelecekte):
 *   - default: Standart bildirim
 *   - reviews: Tekrar zamanı geldi
 *   - achievements: Rozet kazandın
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications: emülatörde çalışmaz')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Genel',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    })

    await Notifications.setNotificationChannelAsync('reviews', {
      name: 'Tekrarlar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E1B4B',
      description: 'Spaced repetition tekrarları',
    })

    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Başarılar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#F59E0B',
      description: 'Rozet ve seviye atlama bildirimleri',
    })
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) {
    console.warn('Expo project ID bulunamadı, push token alınamaz')
    return null
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId })
    return token.data
  } catch (e) {
    console.error('Push token alma hatası:', e)
    return null
  }
}

function getDeviceInfo() {
  return {
    deviceId: Device.osBuildId ?? Device.modelId ?? `${Platform.OS}-${Date.now()}`,
    deviceName:
      Device.deviceName ?? `${Device.brand} ${Device.modelName}`.trim() ?? 'Bilinmeyen Cihaz',
    platform: Platform.OS as 'ios' | 'android' | 'web',
    appVersion: Constants.expoConfig?.version,
    osVersion: Device.osVersion ?? undefined,
  }
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    ;(async () => {
      const token = await registerForPushNotifications()
      if (cancelled) return
      setPushToken(token)

      // Backend'e device kaydet
      try {
        const info = getDeviceInfo()
        await apiFetch('/api/devices/register', {
          method: 'POST',
          body: JSON.stringify({
            ...info,
            pushToken: token ?? undefined,
            pushEnabled: !!token,
          }),
        })
        if (!cancelled) setRegistered(true)
      } catch (e) {
        console.error('Device register hata:', e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Notification tap listener
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      // TODO: deep link handling
      console.log('Notification tapped:', data)
    })
    return () => sub.remove()
  }, [])

  return { pushToken, registered }
}

export async function scheduleLocalNotification(args: {
  title: string
  body: string
  triggerSeconds: number
  data?: any
  channelId?: string
}) {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: args.title,
      body: args.body,
      data: args.data,
      sound: 'default',
    },
    trigger: {
      seconds: args.triggerSeconds,
      channelId: args.channelId,
    } as any,
  })
}

export async function cancelLocalNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id)
}
