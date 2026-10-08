'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Grid2X2,
  LibraryBig,
  Timer,
  Bell,
  Settings2,
  Moon,
  PanelLeftClose,
  Menu,
  ChevronRight,
  LogOut,
  ArrowUpRight,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp, applyTheme } from './provider';
const nav = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/homework', 'Homework', BookOpen],
  ['/calendar', 'Calendar', CalendarDays],
  ['/timetable', 'Timetable', Grid2X2],
  ['/subjects', 'Subjects', LibraryBig],
  ['/timer', 'Study Timer', Timer],
  ['/notifications', 'Notifications', Bell],
  ['/settings', 'Settings', Settings2],
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, mutate, toast } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!mobile) return;
    const sidebar = document.getElementById('planner-navigation');
    sidebar?.querySelector<HTMLAnchorElement>('a')?.focus();
    const desktop = matchMedia('(min-width: 701px)');
    const resize = () => {
      if (desktop.matches) setMobile(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobile(false);
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const focusable = [
        ...sidebar.querySelectorAll<HTMLElement>('a,button:not(:disabled)'),
      ].filter((el) => el.offsetParent !== null);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('keydown', keydown);
      desktop.removeEventListener('change', resize);
      document.querySelector<HTMLButtonElement>('.mobile-menu')?.focus();
    };
  }, [mobile]);
  const current = nav.find(([href]) => (href === '/' ? path === '/' : path.startsWith(href)));
  const remaining = data.homework.filter((h) => h.status !== 'COMPLETED').length;
  async function theme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      await mutate('settings', 'PUT', { settings: { ...data.settings, theme: next } });
    } catch {
      applyTheme(data.settings.theme);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-shade"
          tabIndex={-1}
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="planner-navigation"
        className={`sidebar ${mobile ? 'sidebar-open' : ''}`}
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile || undefined}
        aria-label={mobile ? 'Navigation' : undefined}
      >
        <Link href="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-mark">
            <BookOpen size={24} strokeWidth={1.6} />
          </span>
          <span>
            <strong>SMM</strong>
            <small>Homework Planner</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-btn"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <PanelLeftClose size={20} />
        </button>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(([href, title, Icon], index) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobile(false)}
              aria-current={
                (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined
              }
              className={`nav-item ${index === 6 ? 'nav-separated' : ''}`}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{title}</span>
              {href === '/homework' && remaining > 0 && (
                <span className="nav-count">{remaining}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-note">
            <Sparkles size={19} />
            <h4>One thing at a time.</h4>
            <p>
              A little focus today makes
              <br />
              tomorrow feel lighter.
            </p>
            <Link href="/timer" onClick={() => setMobile(false)}>
              Let’s get started <ArrowUpRight size={15} />
            </Link>
          </div>
          <button className="theme-switch" onClick={theme}>
            <span>
              <Moon size={17} />
              Dark mode
            </span>
            <span className="switch-visual" aria-hidden="true">
              <i />
            </span>
          </button>
          <div className="owner">
            <div className="avatar">S</div>
            <div>
              <strong>My workspace</strong>
              <span>Personal account</span>
            </div>
            <button
              title="Sign out"
              aria-label="Sign out"
              className="icon-btn"
              onClick={async () => {
                const res = await fetch('/api/auth/logout', { method: 'POST' });
                if (res.ok) {
                  router.push('/login');
                  router.refresh();
                } else toast('Could not sign out. Try again.', true);
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-btn"
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="planner-navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={14} />
            <strong>{path === '/setup' ? 'Getting started' : current?.[1] || 'Planner'}</strong>
          </div>
          <div className="topbar-actions">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/homework?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search homework"
                placeholder="Search homework…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <Link
              href="/notifications"
              className="icon-btn notification-link"
              aria-label="View notifications"
            >
              <Bell size={19} />
            </Link>
            <div className="avatar avatar-small" aria-label="Personal workspace">
              S
            </div>
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>SMM Homework Planner</span>
          <span>A little structure. A clearer mind.</span>
          <span>
            <i /> Your own space to stay on track
          </span>
        </footer>
      </div>
    </div>
  );
}
