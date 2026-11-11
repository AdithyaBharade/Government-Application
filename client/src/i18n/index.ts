import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import kn from './locales/kn';
import hi from './locales/hi';
import te from './locales/te';
import ta from './locales/ta';

export const LANGUAGES = [
  { code: 'kn', label: 'ಕನ್ನಡ', speech: 'kn-IN' },
  { code: 'en', label: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', speech: 'hi-IN' },
  { code: 'te', label: 'తెలుగు', speech: 'te-IN' },
  { code: 'ta', label: 'தமிழ்', speech: 'ta-IN' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];
const STORAGE_KEY = 'kadata.lang';

function initialLanguage(): LangCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as LangCode;
  } catch {
    /* storage unavailable */
  }
  return 'kn'; // Kannada first: built for a Karnataka Nadakacheri
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, kn: { translation: kn }, hi: { translation: hi }, te: { translation: te }, ta: { translation: ta } },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const applyLang = (lng: string) => document.documentElement.setAttribute('lang', lng);
applyLang(i18n.language);
i18n.on('languageChanged', (lng) => {
  applyLang(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* storage unavailable */
  }
});

export const currentLang = () => i18n.language as LangCode;
export default i18n;
