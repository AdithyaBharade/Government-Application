import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';

export function LanguageSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation();
  return (
    <label className={`relative inline-flex items-center gap-1.5 ${tone === 'dark' ? 'text-white' : 'text-ink'}`}>
      <Languages size={18} aria-hidden />
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className={`min-h-10 cursor-pointer rounded-lg border px-2 text-sm font-medium outline-none ${
          tone === 'dark' ? 'border-white/25 bg-white/10 text-white [&>option]:text-ink' : 'border-line bg-white'
        }`}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
