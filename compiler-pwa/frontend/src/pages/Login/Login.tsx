import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { Logo } from '../../components/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const next: typeof errors = {};
    if (!email.trim()) next.email = t('login.email_required');
    if (!password) next.password = t('login.password_required');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success(t('toast.welcome_back'));
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.data?.message;
      setFormError(typeof msg === 'string' && msg ? msg : t('login.invalid_credentials'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-page">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-success/8 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-warning/6 blur-3xl" />
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
        {/* Hero — brand + live code window (desktop only) */}
        <section className="hidden lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Icon name="zap" size={12} />
            {t('login.tagline')}
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.15] tracking-tight text-ink">
            {t('login.hero_heading')}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mute">
            {t('login.hero_desc')}
          </p>

          {/* Code window mockup */}
          <div className="mt-8 max-w-md overflow-hidden rounded-2xl border border-edge bg-panel/80 shadow-pop backdrop-blur">
            <div className="flex items-center gap-1.5 border-b border-edge bg-raised/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-2 font-mono text-[11px] text-faint">main.cpp</span>
            </div>
            <pre className="overflow-hidden px-5 py-4 font-mono text-[12.5px] leading-relaxed">
              <code>
                <span className="text-primary">#include</span>
                <span className="text-ink"> {'<iostream>'}</span>
                {'\n\n'}
                <span className="text-warning">int</span>
                <span className="text-ink"> main() {'{'}</span>
                {'\n    '}
                <span className="text-info">std::cout</span>
                <span className="text-ink"> {'<<'} </span>
                <span className="text-success">"Hello, ETEC STUDIO!"</span>
                <span className="text-ink"> {'<<'} std::endl;</span>
                {'\n    '}
                <span className="text-warning">return</span>
                <span className="text-ink"> </span>
                <span className="text-error">0</span>
                <span className="text-ink">;</span>
                {'\n'}
                <span className="text-ink">{'}'}</span>
              </code>
            </pre>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              { icon: 'shield' as const, key: 'login.feature_sandbox' },
              { icon: 'code' as const, key: 'login.feature_languages' },
              { icon: 'clock' as const, key: 'login.feature_history' },
            ].map(({ icon, key }) => (
              <span key={key} className="flex items-center gap-2 text-[13px] text-mute">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success/12 text-success">
                  <Icon name={icon} size={13} />
                </span>
                {t(key)}
              </span>
            ))}
          </div>
        </section>

        {/* Form card */}
        <section className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-edge bg-panel/80 p-6 shadow-pop backdrop-blur-md sm:p-8">
            <div className="mb-6 lg:hidden">
              <Logo />
            </div>

            <h1 className="text-[22px] font-bold tracking-tight text-ink">{t('login.heading')}</h1>
            <p className="mt-1 text-sm text-mute">
              {t('login.new_here')}{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                {t('login.create_account')}
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
                label={t('login.email_label')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email_placeholder')}
                autoComplete="email"
                leftIcon="mail"
                error={errors.email}
              />
              <Input
                label={t('login.password_label')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password_placeholder')}
                autoComplete="current-password"
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
              <Button type="submit" size="lg" loading={submitting} fullWidth>
                {submitting ? t('login.signing_in') : t('login.sign_in')}
              </Button>
            </form>

            <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-faint">
              <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
              {t('login.fine_print')}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
