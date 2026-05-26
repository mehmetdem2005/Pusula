import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

/**
 * Sentry Crash Reporting
 * =======================
 *
 * Yalnızca production'da aktif. Development'ta console.error'a düşer.
 *
 * Konfigürasyon:
 *   EXPO_PUBLIC_SENTRY_DSN — Sentry projesi DSN'i
 *
 * Sample rates:
 *   - Crashes: %100
 *   - Performance traces: %20 (production'da)
 *
 * Privacy:
 *   - User email NOT logged (sadece hashed userId)
 *   - PII automatik scrubbing aktif
 *   - Source maps upload edilir (EAS build sırasında)
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN
const ENV = process.env.APP_ENV ?? 'development'

export function initSentry() {
  if (!DSN || ENV === 'development') {
    console.log('Sentry: skipped (dev or no DSN)')
    return
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: `kavra@${Constants.expoConfig?.version}`,
    dist: String(
      Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1',
    ),

    // Sample rates
    tracesSampleRate: ENV === 'production' ? 0.2 : 1.0,
    sampleRate: 1.0,

    // PII scrubbing
    sendDefaultPii: false,
    beforeSend(event) {
      // Email field'larını scrub'la
      if (event.user?.email) event.user.email = undefined

      // Authorization headers'ı temizle
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.Authorization
      }

      return event
    },

    // Replay (defer — Pro tier'da)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,

    integrations: [
      Sentry.reactNativeTracingIntegration({
        traceFetch: true,
        traceXHR: true,
      }),
    ],
  })
}

export function setSentryUser(userId: string | null) {
  if (!DSN || ENV === 'development') return
  if (userId) {
    Sentry.setUser({ id: userId })
  } else {
    Sentry.setUser(null)
  }
}

export function captureError(error: any, context?: Record<string, any>) {
  if (ENV === 'development') {
    console.error('captureError:', error, context)
    return
  }
  Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (ENV === 'development') {
    console.log(`[${level}]`, message)
    return
  }
  Sentry.captureMessage(message, level)
}
