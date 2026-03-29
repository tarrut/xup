import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import es from './es.json'
import ca from './ca.json'

const saved = localStorage.getItem('lang')
const browser = navigator.language.split('-')[0]
const fallback = 'en'
const supported = ['en', 'es', 'ca']
const lng = saved ?? (supported.includes(browser) ? browser : fallback)

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es }, ca: { translation: ca } },
  lng,
  fallbackLng: fallback,
  interpolation: { escapeValue: false },
})

export default i18n
