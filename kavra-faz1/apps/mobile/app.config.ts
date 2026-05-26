import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kavra',
  slug: 'kavra',
  version: '0.1.0',
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
    infoPlist: {
      NSMicrophoneUsageDescription: 'Kavra sesli dersler için mikrofonu kullanır.',
      NSCameraUsageDescription: 'Defter fotoğrafı ve el yazısı tanıma için kamera gereklidir.',
      NSPhotoLibraryUsageDescription:
        'Ders materyali resimlerini yüklemek için galeri erişimi gereklidir.',
    },
  },
  android: {
    package: 'app.kavra',
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
    ],
    intentFilters: [
      // Paylaşım menüsünden gelenler (WhatsApp, tarayıcı vs)
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
  ],
  experiments: { typedRoutes: true },
  extra: {
    router: { origin: false },
    eas: { projectId: 'YOUR_EAS_PROJECT_ID' },
  },
})
