import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { supabase } from './supabase'

/**
 * WhatsApp / tarayıcı / galeri "Paylaş" menüsünden Kavra'ya gelen içerikleri yakalar.
 *
 * Android intent-filter (app.config.ts'de tanımlı):
 * - text/plain   → WhatsApp mesajı, not
 * - image/*      → Fotoğraf
 * - application/pdf → PDF
 *
 * Intent parse edilip yerine göre yönlendirilir:
 * - text → inbox_items'a yaz + konu seçimi ekranı
 * - image → scan ekranına
 * - pdf → documents/upload akışı
 */
export function useShareIntentHandler() {
  const router = useRouter()

  useEffect(() => {
    // Uygulama zaten açıkken gelen link
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleSharedUrl(url, router)
    })

    // Uygulama kapalıyken açılan ilk URL
    Linking.getInitialURL().then((url) => {
      if (url) handleSharedUrl(url, router)
    })

    return () => sub.remove()
  }, [router])
}

async function handleSharedUrl(url: string, router: any) {
  try {
    const parsed = Linking.parse(url)

    // Deep link scheme: kavra://share?text=... veya ?image=...
    if (parsed.hostname === 'share' || parsed.path === 'share') {
      const text = parsed.queryParams?.text as string | undefined
      if (text) {
        await saveTextToInbox(text)
        Alert.alert('📥 Eklendi', 'Paylaşılan metin "inbox"a kaydedildi.', [
          { text: 'Göz At', onPress: () => router.push('/inbox') },
          { text: 'Tamam' },
        ])
        return
      }
    }

    // Auth callback
    if (parsed.path === 'auth/callback') {
      // Supabase zaten yakalıyor, bir şey yapmaya gerek yok
      return
    }
  } catch (e) {
    console.warn('Share URL parse hatası:', e)
  }
}

async function saveTextToInbox(text: string) {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return

  const isUrl = /^https?:\/\//.test(text.trim())

  await supabase.from('inbox_items').insert({
    user_id: userData.user.id,
    source: 'share_intent',
    content_type: isUrl ? 'url' : 'text',
    raw_content: isUrl ? null : text,
    url: isUrl ? text.trim() : null,
    processed: false,
  })
}
