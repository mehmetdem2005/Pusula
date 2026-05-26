import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kavra',
  slug: 'kavra',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'kavra',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1E1B4B',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.kavra',
    buildNumber: '1',
    infoPlist: {
      NSMicrophoneUsageDescription: 'Kavra sesli dersler için mikrofonu kullanır.',
      NSCameraUsageDescription: 'Defter fotoğrafı ve el yazısı tanıma için kamera gereklidir.',
      NSPhotoLibraryUsageDescription:
        'Ders materyali resimlerini yüklemek için galeri erişimi gereklidir.',
      NSUserTrackingUsageDescription: 'Kavra hiçbir cross-app takip yapmaz, ama ATT için zorunlu.',
      ITSAppUsesNonExemptEncryption: false,
      LSApplicationQueriesSchemes: ['mailto', 'tel'],
    },
    associatedDomains: ['applinks:kavra.app'],
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.kavra',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#1E1B4B',
    },
    permissions: [
      'RECORD_AUDIO',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'VIBRATE',
      'POST_NOTIFICATIONS',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'kavra.app' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      {
        action: 'SEND',
        category: ['DEFAULT'],
        data: [
          { mimeType: 'text/plain' },
          { mimeType: 'image/*' },
          { mimeType: 'application/pdf' },
        ],
      },
    ],
    blockedPermissions: ['ACCESS_BACKGROUND_LOCATION'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    ['expo-av', { microphonePermission: 'Sesli ders için mikrofona erişim gerekli.' }],
    ['expo-image-picker', { photosPermission: 'Ders materyali için galeri erişimi gerekli.' }],
    ['expo-camera', { cameraPermission: 'El yazısı tanıma için kamera erişimi gerekli.' }],
    ['expo-notifications', { icon: './assets/images/notification-icon.png', color: '#F59E0B' }],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'Kavra hiçbir cross-app takip yapmaz, ama Apple bu ATT promptunu zorunlu kılar.',
      },
    ],
    'expo-document-picker',
    [
      'expo-build-properties',
      {
        // Compose Compiler 1.5.15 Kotlin 1.9.25 ister; SDK 52 varsayilani 1.9.24
        android: { kotlinVersion: '1.9.25' },
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    router: { origin: false },
    eas: { projectId: process.env.EAS_PROJECT_ID ?? 'b06ccde0-c905-4434-8cd0-841531cdd7d8' },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    voiceBaseUrl: process.env.EXPO_PUBLIC_VOICE_BASE_URL,
    pdfBaseUrl: process.env.EXPO_PUBLIC_PDF_BASE_URL,
    revenueCatIos: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    revenueCatAndroid: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/b06ccde0-c905-4434-8cd0-841531cdd7d8',
    enabled: true,
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
  },
  owner: 'mehmetdem2005',
})
