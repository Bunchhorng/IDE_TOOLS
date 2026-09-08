import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Logo } from './Logo';
import { Avatar } from './ui/Avatar';
import { Button, buttonClass } from './ui/Button';
import { Dropdown, type MenuItem } from './ui/Dropdown';
import { Icon, type IconName } from './ui/Icon';
import { Toggle } from './ui/Toggle';
import { InstallPWAButton } from './InstallPWAButton';
import { cn } from '../lib/cn';

export function TopNav() {
  const { isAuthenticated, isGuest, user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const go = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    toast.info('Signed out', 'See you soon!');
    navigate('/');
  };

  const userMenuItems: MenuItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: 'grid',
      onSelect: () => navigate('/dashboard'),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: 'settings',
      onSelect: () => navigate('/settings'),
    },
    {
      key: 'logout',
      label: 'Sign out',
      icon: 'logout',
      danger: true,
      onSelect: handleLogout,
    },
  ];

  const drawerLinks: { key: string; label: string; icon: IconName; path: string }[] =
    isAuthenticated
      ? [
          { key: 'dashboard', label: 'Dashboard', icon: 'grid', path: '/dashboard' },
          { key: 'history', label: 'History', icon: 'clock', path: '/history' },
          { key: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
        ]
      : [];

  return (
    <header
      className={cn('sticky top-0 z-30 border-b border-edge bg-page/85 pt-[env(safe-area-inset-top)] backdrop-blur-md')}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-mute transition-colors hover:bg-raised hover:text-ink lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" size={20} />
          </button>

          <Link to={isAuthenticated ? '/dashboard' : '/'} aria-label="CodeRunner home">
            <span className="sm:hidden">
              <Logo size="sm" withText={false} />
            </span>
            <span className="hidden sm:block">
              <Logo />
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggle}
            className="rounded-md p-2 text-mute transition-colors hover:bg-raised hover:text-ink"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>

          {!isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate('/login')}
              >
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Get started
              </Button>
            </>
          )}

          {isGuest && (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/40 text-primary hover:border-primary/60"
              onClick={() => navigate('/register')}
            >
              <Icon name="user" size={14} />
              <span className="sm:hidden">Save</span>
              <span className="hidden sm:inline">Save your account</span>
            </Button>
          )}

          {isAuthenticated && user && (
            <Dropdown
              trigger={
                <button
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-raised"
                  aria-label="Account menu"
                >
                  <Avatar name={user.name} size="sm" />
                  <span className="hidden max-w-32 truncate text-sm font-medium text-ink md:block">
                    {user.name?.trim() ? user.name.split(' ')[0] : 'Guest'}
                  </span>
                  <Icon name="chevronDown" size={14} className="text-faint" />
                </button>
              }
              items={userMenuItems}
            />
          )}
        </div>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden">
          <div
            className="absolute inset-0 animate-cr-fade-in bg-ink/50 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-hidden bg-panel shadow-pop animate-cr-slide-left"
          >
            <div className="flex items-center justify-between border-b border-edge px-4 py-3.5 pt-[calc(0.875rem+env(safe-area-inset-top))]">
              <Link
                to={isAuthenticated ? '/dashboard' : '/'}
                onClick={() => setDrawerOpen(false)}
                aria-label="CodeRunner home"
              >
                <Logo size="sm" />
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1.5 text-faint transition-colors hover:bg-raised hover:text-ink"
                aria-label="Close menu"
              >
                <Icon name="x" size={19} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
              {!isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <Link to="/login" className={buttonClass('secondary', 'md')} onClick={() => setDrawerOpen(false)}>
                    Sign in
                  </Link>
                  <Link to="/register" className={buttonClass('primary', 'md')} onClick={() => setDrawerOpen(false)}>
                    Get started
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {isGuest && (
                    <Link
                      to="/register"
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs leading-relaxed text-ink"
                    >
                      <span className="font-semibold text-primary">Save your projects</span>
                      <span className="mt-0.5 block text-faint">
                        Create an account to save and sync your work across devices.
                      </span>
                    </Link>
                  )}
                  <nav aria-label="Main navigation" className="flex flex-col gap-0.5">
                    {drawerLinks.map((item) => {
                      const active = pathname.startsWith(item.path);
                      return (
                        <button
                          key={item.key}
                          onClick={() => go(item.path)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                            active ? 'bg-primary/10 text-ink' : 'text-mute hover:bg-raised hover:text-ink',
                          )}
                        >
                          <Icon
                            name={item.icon}
                            size={18}
                            className={cn('shrink-0', active ? 'text-primary' : 'text-faint')}
                          />
                          {item.label}
                          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}

              <div className="mt-auto">
                <div className="my-3 h-px bg-edge" />
                <InstallPWAButton variant="ghost" size="md" className="w-full justify-start px-3" />
                <Toggle
                  checked={theme === 'dark'}
                  onChange={toggle}
                  label={`${theme === 'dark' ? 'Dark' : 'Light'} mode`}
                  description="Switch the editor and app theme"
                />
                {isAuthenticated && (
                  <button
                    onClick={() => void handleLogout()}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-error transition-colors hover:bg-error/10"
                  >
                    <Icon name="logout" size={18} className="shrink-0 text-error" />
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}