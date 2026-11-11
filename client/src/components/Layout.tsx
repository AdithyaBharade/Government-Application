import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, FilePlus2, Files, Inbox, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { personName } from '../lib/format';

export function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  if (!user) return null;

  const links = [
    { to: '/', label: t('nav.queue'), icon: Inbox, end: true },
    { to: '/applications', label: t('nav.all'), icon: Files },
    ...(user.role === 'OPERATOR' ? [{ to: '/applications/new', label: t('nav.new'), icon: FilePlus2 }] : []),
    { to: '/insights', label: t('nav.insights'), icon: BarChart3 },
  ];

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="no-print sticky top-0 z-30 bg-brand-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15 text-lg font-bold">ಕ</span>
            <span className="leading-tight">
              <span className="block font-semibold">{t('app.name')}</span>
              <span className="block text-xs text-white/70">{t('app.tagline')}</span>
            </span>
          </NavLink>

          <nav className="ml-6 hidden gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher tone="dark" />
            <div className="hidden text-right text-xs leading-tight sm:block">
              <div className="font-semibold">{personName(user)}</div>
              <div className="text-white/70">{t(`roles.${user.role}`)}</div>
            </div>
            <button onClick={logout} className="grid size-10 place-items-center rounded-lg hover:bg-white/10" title={t('nav.logout')}>
              <LogOut size={18} />
              <span className="sr-only">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>

      {/* Bottom navigation for phones – field officers mostly use mobiles */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white md:hidden" style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }} aria-label="Main">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${isActive ? 'text-brand-700' : 'text-muted'}`
            }
          >
            <l.icon size={20} aria-hidden />
            <span className="line-clamp-1 text-center">{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
