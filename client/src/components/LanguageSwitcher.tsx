import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { LANGUAGES } from '../i18n';

const ITEMS = LANGUAGES.map((l) => ({ value: l.code, label: l.label }));

export function LanguageSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation();
  return (
    <Select items={ITEMS} value={i18n.language} onValueChange={(v) => v && i18n.changeLanguage(String(v))}>
      <SelectTrigger
        aria-label={t('nav.language')}
        className={cn('min-w-28', tone === 'dark' && 'border-white/25 bg-white/10 text-white hover:bg-white/15 [&_svg]:text-white/80')}
      >
        <Languages aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ITEMS.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
