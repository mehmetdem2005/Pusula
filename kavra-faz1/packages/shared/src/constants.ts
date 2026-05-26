// ============================================================================
// Kavra — Sabitler
// ============================================================================

export const BRAND = {
  name: 'Kavra',
  tagline: 'Kavra. Her şeyi.',
  package: 'app.kavra',
  domain: 'kavra.app',
  colors: {
    primary: '#1E1B4B',
    primaryLight: '#4F46E5',
    accent: '#F59E0B',
    accentLight: '#FCD34D',
    background: '#FAFAFA',
    backgroundDark: '#0F0F1A',
    text: '#1E1B4B',
    textMuted: '#64748B',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
} as const

export const PRICING = {
  free: { priceUSD: 0, priceTRY: 0 },
  proMonthly: { priceUSD: 4.99, priceTRY: 199, stripeId: 'kavra_pro_monthly' },
  proYearly: { priceUSD: 39, priceTRY: 1499, stripeId: 'kavra_pro_yearly' },
  proLifetime: { priceUSD: 99, priceTRY: 3999, stripeId: 'kavra_pro_lifetime' },
} as const

export const LIMITS = {
  free: {
    pdfUploadsPerMonth: 5,
    maxStorageMB: 100,
    personalitiesAvailable: 3,
    conceptMap3D: false,
    voiceCloning: false,
    highQualityTTS: false,
  },
  pro: {
    pdfUploadsPerMonth: Number.POSITIVE_INFINITY,
    maxStorageMB: 5000,
    personalitiesAvailable: Number.POSITIVE_INFINITY,
    conceptMap3D: true,
    voiceCloning: true,
    highQualityTTS: true,
  },
} as const

export const LEARNING_CONTEXTS = [
  'first_exposure',
  'practice',
  'review',
  'weak_spot',
  'exam_prep',
  'creativity_block',
] as const
export type LearningContext = (typeof LEARNING_CONTEXTS)[number]

export const UI_COMPONENTS = ['chat', 'flashcard', 'quiz', 'mindmap', 'journal', 'focus'] as const
export type UIComponent = (typeof UI_COMPONENTS)[number]

export const SUPPORTED_UI_LANGUAGES = ['tr', 'en'] as const
export type UILanguage = (typeof SUPPORTED_UI_LANGUAGES)[number]

export const SUPPORTED_CONTENT_LANGUAGES = [
  'tr',
  'en',
  'de',
  'es',
  'fr',
  'it',
  'pt',
  'ru',
  'nl',
  'pl',
  'ar',
  'fa',
  'hi',
  'zh',
  'ja',
  'ko',
] as const
export type ContentLanguage = (typeof SUPPORTED_CONTENT_LANGUAGES)[number]

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
export const GROQ_MODEL_CATEGORIES = [
  'fast',
  'versatile',
  'vision',
  'reasoning',
  'compound',
  'safety',
  'stt',
] as const

export const SM2_DEFAULTS = {
  initialEase: 2.5,
  minEase: 1.3,
  initialInterval: 1,
} as const
