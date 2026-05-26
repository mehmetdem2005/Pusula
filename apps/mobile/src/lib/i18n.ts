import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../locales/en.json'
import tr from '../../locales/tr.json'

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'tr'
const supportedLocales = ['tr', 'en']
const initialLocale = supportedLocales.includes(deviceLocale) ? deviceLocale : 'tr'

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: initialLocale,
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
})

export default i18n
