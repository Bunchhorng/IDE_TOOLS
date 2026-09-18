import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { Logo } from './Logo';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Dropdown, type MenuItem } from './ui/Dropdown';
import { Icon } from './ui/Icon';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '../lib/cn';

export function TopNav() {
  const { isAuthenticated, isGuest, user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    toast.info(t('toast.signed_out'), t('toast.see_you'));
    navigate('/');
  };

  const userMenuItems: MenuItem[] = [
    {
      key: 'dashboard',
      label: t('nav.dashboard'),
      icon: 'grid',
      onSelect: () => navigate('/dashboard'),
    },
    {
      key: 'settings',
      label: t('nav.settings'),
      icon: 'settings',
      onSelect: () => navigate('/settings'),
    },
    {
      key: 'logout',
      label: t('nav.sign_out'),
      icon: 'logout',
      danger: true,
      onSelect: handleLogout,
    },
  ];

  return (
    <header
      className={cn('sticky top-0 z-30 border-b border-edge bg-page/85 pt-[env(safe-area-inset-top)] backdrop-blur-md')}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link to={isAuthenticated ? '/dashboard' : '/'} aria-label={t('nav.home_aria')}>
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
            aria-label={t('nav.switch_theme', { theme: theme === 'dark' ? t('settings.light') : t('settings.dark') })}
            title={t('nav.switch_theme', { theme: theme === 'dark' ? t('settings.light') : t('settings.dark') })}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>

          <LanguageSwitcher className="hidden sm:inline-flex" />

          {!isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate('/login')}
              >
                {t('nav.sign_in')}
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                {t('nav.get_started')}
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
              <span className="sm:hidden">{t('nav.save')}</span>
              <span className="hidden sm:inline">{t('nav.save_account')}</span>
            </Button>
          )}

          {isAuthenticated && user && (
            <Dropdown
              trigger={
                <button
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-raised"
                  aria-label={t('nav.account_menu')}
                >
                  <Avatar name={user.name} size="sm" />
                  <span className="hidden max-w-32 truncate text-sm font-medium text-ink md:block">
                    {user.name?.trim() ? user.name.split(' ')[0] : t('settings.guest')}
                  </span>
                  <Icon name="chevronDown" size={14} className="text-faint" />
                </button>
              }
              items={userMenuItems}
            />
          )}
        </div>
      </nav>
    </header>
  );
}
