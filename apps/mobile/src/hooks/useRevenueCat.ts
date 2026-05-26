import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, {
  type PurchasesOffering,
  type PurchasesPackage,
  type CustomerInfo,
} from 'react-native-purchases'
import { useAuth } from '../stores/auth'

/**
 * RevenueCat — iOS/Android in-app purchases
 * ==========================================
 *
 * Ortam değişkenleri:
 *   - EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_xxx'
 *   - EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'goog_xxx'
 *
 * Setup:
 *   1. RevenueCat dashboard'da "kavra-pro" entitlement'ı olmalı
 *   2. Offerings: "default" → packages:
 *      - $rc_monthly (kavra_pro_monthly @ $4.99)
 *      - $rc_annual (kavra_pro_yearly @ $39.99)
 *      - $rc_lifetime (kavra_pro_lifetime @ $99.99)
 *   3. Stripe entegrasyonu için web RevenueCat dashboard'tan ayrı set
 */

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY

let initialized = false

export async function initializeRevenueCat(userId: string) {
  if (initialized) {
    await Purchases.logIn(userId)
    return
  }

  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
  if (!apiKey) {
    console.warn('RevenueCat API key missing for', Platform.OS)
    return
  }

  await Purchases.configure({
    apiKey,
    appUserID: userId,
  })

  // VERBOSE mode in development
  if (__DEV__) {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG)
  }

  initialized = true
}

export function useRevenueCat() {
  const { user } = useAuth()
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)

  // Init on auth
  useEffect(() => {
    if (!user) return
    ;(async () => {
      await initializeRevenueCat(user.id)
      await refresh()
    })()
  }, [user?.id])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const off = await Purchases.getOfferings()
      setOfferings(off.current)

      const info = await Purchases.getCustomerInfo()
      setCustomerInfo(info)
      setIsPro(typeof info.entitlements.active['kavra-pro'] !== 'undefined')
    } catch (e) {
      console.error('RevenueCat refresh hata:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo: ci } = await Purchases.purchasePackage(pkg)
      setCustomerInfo(ci)
      const nowPro = typeof ci.entitlements.active['kavra-pro'] !== 'undefined'
      setIsPro(nowPro)
      return { success: true, isPro: nowPro }
    } catch (e: any) {
      if (e.userCancelled) return { success: false, cancelled: true }
      throw e
    }
  }, [])

  const restorePurchases = useCallback(async () => {
    try {
      const ci = await Purchases.restorePurchases()
      setCustomerInfo(ci)
      const nowPro = typeof ci.entitlements.active['kavra-pro'] !== 'undefined'
      setIsPro(nowPro)
      return { success: true, isPro: nowPro }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }, [])

  return {
    offerings,
    customerInfo,
    isPro,
    loading,
    refresh,
    purchase,
    restorePurchases,
  }
}
