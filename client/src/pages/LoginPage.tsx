import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Spinner } from '../components/common';
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
  const [showPassword, setShowPassword] = useState(false);
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
      setError(errorMessage(err) === 'NETWORK' ? t('common.network') : t('login.error'));
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

          <Card className="shadow-xl">
            <form onSubmit={submit} className="contents">
              <CardHeader>
                <CardTitle className="text-lg">{t('login.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">{t('login.username')}</Label>
                  <Input id="username" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      aria-pressed={showPassword}
                      title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                    </button>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <Spinner /> : <LogIn aria-hidden />} {t('login.submit')}
                </Button>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-2 border-t">
                <CardDescription className="text-xs">{t('login.demo')}</CardDescription>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO.map((d) => (
                    <Button
                      key={d.username}
                      type="button"
                      variant="outline"
                      className="h-auto flex-col items-start gap-0 py-2 text-left whitespace-normal"
                      onClick={() => {
                        setUsername(d.username);
                        setPassword('Demo@123');
                      }}
                    >
                      <span className="font-semibold">{d.username}</span>
                      <span className="text-xs font-normal text-muted-foreground">{t(`roles.${d.role}`)}</span>
                    </Button>
                  ))}
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
