import { useAuth } from '@/lib/auth';
import { useHashRoute } from '@/lib/router';
import type { Role } from '@/lib/types';
import { UtensilsCrossed, Store, LayoutDashboard, LogOut, Calendar, MessageSquare, Plus, ShieldCheck, Flag } from 'lucide-react';
import type { ReactNode } from 'react';

interface NavItem { label: string; route: string; icon: typeof Calendar }

const NAV: Record<Role, NavItem[]> = {
  customer: [
    { label: 'Discover', route: '/', icon: Store },
    { label: 'My Reservations', route: '/reservations', icon: Calendar },
    { label: 'Messages', route: '/messages', icon: MessageSquare },
  ],
  owner: [
    { label: 'Dashboard', route: '/owner', icon: LayoutDashboard },
    { label: 'Reservations', route: '/owner/reservations', icon: Calendar },
    { label: 'Menu', route: '/owner/menu', icon: UtensilsCrossed },
    { label: 'Messages', route: '/owner/messages', icon: MessageSquare },
  ],
  admin: [
    { label: 'Overview', route: '/admin', icon: LayoutDashboard },
    { label: 'Restaurants', route: '/admin/restaurants', icon: Store },
    { label: 'Users', route: '/admin/users', icon: ShieldCheck },
    { label: 'Reports', route: '/admin/reports', icon: Flag },
  ],
};

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [route, navigate] = useHashRoute();
  if (!profile) return null;
  const items = NAV[profile.role];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button onClick={() => navigate(items[0].route)} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
              <UtensilsCrossed className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight">TableSeat</span>
            <span className="hidden rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500 sm:inline">
              {profile.role}
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {items.map((it) => {
              const active = route === it.route || route.startsWith(it.route + '/');
              return (
                <button
                  key={it.route}
                  onClick={() => navigate(it.route)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    active ? 'bg-orange-50 text-orange-700' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-stone-100" title="Edit profile">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{profile.full_name || profile.email}</p>
                <p className="text-xs text-stone-400">{profile.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-sm font-bold uppercase text-stone-600 ring-2 ring-white transition group-hover:ring-orange-200">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : (
                  (profile.full_name || profile.email || '?').charAt(0)
                )}
              </div>
            </button>
            <button onClick={signOut} title="Sign out" className="btn-ghost px-2.5">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-stone-100 px-4 py-2 md:hidden">
          {items.map((it) => {
            const active = route === it.route || route.startsWith(it.route + '/');
            return (
              <button
                key={it.route}
                onClick={() => navigate(it.route)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'bg-orange-50 text-orange-700' : 'text-stone-600'
                }`}
              >
                <it.icon className="h-3.5 w-3.5" />
                {it.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }: { icon: typeof Plus; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-stone-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-stone-500">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
