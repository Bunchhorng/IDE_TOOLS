import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
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
    if (!email.trim()) next.email = 'Email is required';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.data?.message;
      setFormError(typeof msg === 'string' && msg ? msg : 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-editor lg:block">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-success/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" aria-label="CodeRunner">
            <Logo />
          </Link>
          <div className="max-w-md">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Your code, compiled in a secure sandbox.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-mute">
              Sign in to continue to your projects, execution history and settings across devices.
            </p>
            <div className="mt-6 space-y-3">
              {['Isolated Docker execution', 'C, C++ and Python runtimes', 'Full execution history'].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-mute">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                    <Icon name="check" size={12} />
                  </span>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-faint">
            <LanguageIconRow />
            <span>Secure · Fast · Offline-first</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-page px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" aria-label="CodeRunner">
              <Logo />
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-mute">
            New here?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>

          {formError && (
            <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-error/40 bg-error/10 px-3.5 py-2.5 text-sm text-error">
              <Icon name="alertCircle" size={16} />
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-faint transition-colors hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name="eye" size={15} />
                </button>
              }
            />
            <Button type="submit" size="lg" loading={submitting} fullWidth>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-faint">
            Protected by rate-limited authentication and scoped API tokens.
          </p>
        </div>
      </div>
    </div>
  );
}

function LanguageIconRow() {
  return (
    <span className="flex items-center gap-1.5">
      {(['c', 'cpp', 'python'] as const).map((l) => (
        <span
          key={l}
          className="flex h-6 w-6 items-center justify-center rounded bg-panel text-[10px] font-bold text-mute"
        >
          {l === 'cpp' ? 'C++' : l === 'python' ? 'Py' : 'C'}
        </span>
      ))}
    </span>
  );
}