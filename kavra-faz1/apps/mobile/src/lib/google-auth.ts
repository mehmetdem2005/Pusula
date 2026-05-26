import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'

// Expo Dev Build gerektiriyor; Expo Go'da browser-based OAuth çalışır ama sınırlı
WebBrowser.maybeCompleteAuthSession()

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const redirectTo = Linking.createURL('auth/callback')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) return { error: error.message }
  if (!data?.url) return { error: 'Google yetkilendirme URL alınamadı' }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  })

  if (result.type !== 'success' || !result.url) {
    return { error: 'Giriş iptal edildi' }
  }

  // Supabase URL'den access_token çek
  const url = new URL(result.url)
  const params = new URLSearchParams(url.hash.replace(/^#/, ''))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) {
    return { error: 'Token alınamadı' }
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (sessionError) return { error: sessionError.message }
  return {}
}
