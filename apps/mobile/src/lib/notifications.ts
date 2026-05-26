import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { apiFetch } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Expo Push Token al ve backend'e kaydet.
 * Idempotent — birden çok kez çağrılabilir.
 */
export async function registerPushNotifications(): Promise<{ token?: string; error?: string }> {
  if (!Device.isDevice) {
    return { error: 'Fiziksel cihaz gerekli (emülatörde push çalışmaz)' }
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') {
    return { error: 'Bildirim izni reddedildi' }
  }

  // Android 8+ kanal
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kavra',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const token = tokenResp.data

    // Backend'e kaydet
    await apiFetch('/api/push/register', {
      method: 'POST',
      body: JSON.stringify({
        token,
        deviceInfo: {
          platform: Platform.OS,
          model: Device.modelName,
          osVersion: Device.osVersion,
        },
      }),
    })

    return { token }
  } catch (err: any) {
    return { error: err.message }
  }
}

/** Kullanıcı çıkış yaparken çağrılır */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    await apiFetch('/api/push/token', {
      method: 'DELETE',
      body: JSON.stringify({ token: tokenResp.data }),
    })
  } catch {
    // sessizce başarısız ol
  }
}
