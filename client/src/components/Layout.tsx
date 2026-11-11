import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, ChevronDown, FilePlus2, Files, Inbox, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { personName } from '../lib/format';

export function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  if (!user) return null;

  const links = [
    { to: '/', label: t('nav.queue'), icon: Inbox, end: true },
    { to: '/applications', label: t('nav.all'), icon: Files, end: true },
    ...(user.role === 'OPERATOR' ? [{ to: '/applications/new', label: t('nav.new'), icon: FilePlus2, end: true }] : []),
    { to: '/insights', label: t('nav.insights'), icon: BarChart3, end: true },
  ];

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="no-print sticky top-0 z-30 bg-brand-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15 text-lg font-bold">ಕ</span>
            <span className="leading-tight">
              <span className="block font-semibold">{t('app.name')}</span>
              <span className="hidden text-xs text-white/70 sm:block">{t('app.tagline')}</span>
            </span>
          </NavLink>

          <nav className="ml-6 hidden gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white')
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher tone="dark" />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="h-10 gap-2 px-2 text-white hover:bg-white/10 hover:text-white" />}>
                <span className="grid size-8 place-items-center rounded-full bg-white/20 text-sm font-semibold">{user.name.charAt(0)}</span>
                <span className="hidden text-left text-xs leading-tight sm:block">
                  <span className="block font-semibold">{personName(user)}</span>
                  <span className="block text-white/70">{t(`rolesShort.${user.role}`)}</span>
                </span>
                <ChevronDown className="size-4 text-white/70" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="font-semibold text-foreground">{personName(user)}</div>
                    <div className="text-xs font-normal">{t(`roles.${user.role}`)}</div>
                    <div className="text-xs font-normal">{user.office}</div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut aria-hidden /> {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>

      {/* Bottom navigation for phones – field officers mostly use mobiles */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t bg-card md:hidden"
        style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}
        aria-label="Main"
      >
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn('flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')
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
