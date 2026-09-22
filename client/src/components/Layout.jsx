import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Settings, LogOut, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/guests', label: 'Guests', icon: Users },
  { to: '/guests/new', label: 'Add Guest', icon: UserPlus },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
        }`
      }
    >
      <Icon size={18} />
      {item.label}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { admin, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-full bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Heart size={18} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">Guest Manager</p>
            <p className="truncate text-xs text-ink-400">Engagement 2026</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t border-ink-100 p-3">
          <div className="mb-2 px-3 py-1">
            <p className="text-xs text-ink-400">Signed in as</p>
            <p className="truncate text-sm font-medium text-ink-800">{admin?.username}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Heart size={16} fill="currentColor" />
          </div>
          <p className="text-sm font-semibold text-ink-900">Guest Manager</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50"
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="px-4 pb-28 pt-4 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink-100 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
                active ? 'text-ink-900' : 'text-ink-400'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
