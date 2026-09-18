import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { Logo } from '../../components/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

function extractErrors(err: unknown, fallback: string): string {
  const data = (err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  return data?.message ?? fallback;
}

/** 0-4 password strength score: length + variety. */
function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export default function Register() {
  const { register, isGuest, upgradeGuest } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const strengthLabel = useMemo(() => {
    if (!password) return '';
    return t(
      score <= 1 ? 'register.strength_weak' : score === 2 ? 'register.strength_fair' : score === 3 ? 'register.strength_good' : 'register.strength_strong',
    );
  }, [password, score, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = t('register.name_short');
    if (!/^[^\s@]+@etec\.com$/i.test(email.trim())) next.email = t('register.email_domain');
    if (password.length < 8) next.password = t('register.password_short');
    if (confirm !== password) next.confirm = t('register.passwords_no_match');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (isGuest) {
        await upgradeGuest(name.trim(), email.trim(), password, confirm);
        toast.success(t('toast.account_saved'), t('toast.code_linked'));
      } else {
        await register(name.trim(), email.trim(), password, confirm);
        toast.success(t('toast.account_created'), t('toast.welcome_coderunner'));
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      setFormError(extractErrors(err, t('register.something_wrong')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-page">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-warning/8 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-success/6 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-8">
        <Link to="/" aria-label="ETEC STUDIO">
          <Logo />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-mute transition-colors hover:bg-raised hover:text-ink"
        >
          <Icon name="arrowLeft" size={14} />
          {t('nav.back_home')}
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Hero (desktop only) */}
        <section className="hidden lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Icon name="rocket" size={12} />
            {t('register.hero_badge')}
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.15] tracking-tight text-ink">
            {t('register.hero_heading')}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mute">
            {t('register.hero_desc')}
          </p>

          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[
              { icon: 'code' as const, label: 'C' },
              { icon: 'code' as const, label: 'C++' },
              { icon: 'terminal' as const, label: 'Python' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl border border-edge bg-panel/70 px-3 py-4 text-center"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={icon} size={15} />
                </span>
                <span className="text-[13px] font-semibold text-ink">{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-md text-[13px] leading-relaxed text-mute">
            {t('register.hero_perk')}
          </p>
        </section>

        {/* Form card */}
        <section className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-edge bg-panel/80 p-6 shadow-pop backdrop-blur-md sm:p-8">
            <div className="mb-6 lg:hidden">
              <Logo />
            </div>

            {isGuest && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
                <Icon name="star" size={15} className="mt-0.5 shrink-0 text-warning" />
                <span>{t('register.guest_upgrade_banner')}</span>
              </div>
            )}

            <h1 className="text-[22px] font-bold tracking-tight text-ink">{t('register.heading')}</h1>
            <p className="mt-1 text-sm text-mute">
              {t('register.has_account')}{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t('register.sign_in')}
              </Link>
            </p>

            {formError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-error/40 bg-error/10 px-3.5 py-2.5 text-sm text-error"
              >
                <Icon name="alertCircle" size={16} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
              <Input
                label={t('register.name_label')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('register.name_placeholder')}
                autoComplete="name"
                leftIcon="user"
                error={errors.name}
              />
              <Input
                label={t('register.email_label')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('register.email_placeholder')}
                autoComplete="email"
                leftIcon="mail"
                error={errors.email}
              />

              <div>
                <Input
                  label={t('register.password_label')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('register.password_placeholder')}
                  autoComplete="new-password"
                  leftIcon="lock"
                  error={errors.password}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-faint transition-colors hover:text-ink"
                      aria-label={showPassword ? t('login.hide_password') : t('login.show_password')}
                    >
                      <Icon name="eye" size={15} />
                    </button>
                  }
                />
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-1 flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cnBar(i < score)}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-medium text-mute">{strengthLabel}</span>
                  </div>
                )}
              </div>

              <Input
                label={t('register.confirm_label')}
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('register.confirm_placeholder')}
                autoComplete="new-password"
                leftIcon="lock"
                error={errors.confirm}
              />

              <Button type="submit" size="lg" loading={submitting} fullWidth>
                {submitting ? t('register.creating') : t('register.create')}
              </Button>
            </form>

            <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-faint">
              <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
              {t('register.fine_print')}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Strength bar segment color by fill state. */
function cnBar(filled: boolean): string {
  return `h-full flex-1 rounded-full transition-colors ${filled ? 'bg-primary' : 'bg-edge'}`;
}
