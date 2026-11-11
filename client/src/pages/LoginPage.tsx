import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { errorMessage } from '../api/client';
import type { Role } from '../api/types';

const DEMO: Array<{ username: string; role: Role }> = [
  { username: 'operator', role: 'OPERATOR' },
  { username: 'va', role: 'VA' },
  { username: 'ri', role: 'RI' },
  { username: 'dt', role: 'DT' },
];

export function LoginPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg === 'NETWORK' ? t('common.network') : t('login.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-brand-700">
      <div className="flex justify-end p-4">
        <LanguageSwitcher tone="dark" />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center text-white">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-white/15 text-3xl font-bold">ಕ</div>
            <h1 className="text-2xl font-bold">{t('app.name')}</h1>
            <p className="mt-1 text-sm text-white/75">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={submit} className="card space-y-4 p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{t('login.title')}</h2>
            <div>
              <label className="label" htmlFor="username">{t('login.username')}</label>
              <input id="username" className="input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="password">{t('login.password')}</label>
              <input id="password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              <LogIn size={18} aria-hidden /> {t('login.submit')}
            </button>

            <div className="border-t border-line pt-4">
              <p className="mb-2 text-xs text-muted">{t('login.demo')}</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.username}
                    type="button"
                    onClick={() => {
                      setUsername(d.username);
                      setPassword('Demo@123');
                    }}
                    className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-brand-500 hover:bg-brand-50"
                  >
                    <span className="block font-semibold">{d.username}</span>
                    <span className="block text-xs text-muted">{t(`roles.${d.role}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
