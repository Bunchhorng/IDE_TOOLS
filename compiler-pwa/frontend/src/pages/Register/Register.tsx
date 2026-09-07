import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
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

function extractErrors(err: unknown): string {
  const data = (err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  return data?.message ?? 'Something went wrong. Please try again.';
}

export default function Register() {
  const { register, isGuest, upgradeGuest } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (password.length < 8) next.password = 'Password must be at least 8 characters';
    if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (isGuest) {
        await upgradeGuest(name.trim(), email.trim(), password, confirm);
        toast.success('Account saved', 'Your code is now linked to your account.');
      } else {
        await register(name.trim(), email.trim(), password, confirm);
        toast.success('Account created', 'Welcome to CodeRunner!');
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      setFormError(extractErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-editor lg:block">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-warning/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" aria-label="CodeRunner">
            <Logo />
          </Link>
          <div className="max-w-md">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Start running C, C++ and Python in minutes.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-mute">
              No setup, no installs. Your projects, files and results live in one place.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {['c', 'cpp', 'python'].map((l) => (
                <span
                  key={l}
                  className="rounded-md border border-edge bg-panel px-2.5 py-1 text-xs font-semibold text-mute"
                >
                  {l === 'cpp' ? 'C++' : l === 'python' ? 'Python' : 'C'}
                </span>
              ))}
            </div>
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

          <h1 className="text-2xl font-bold tracking-tight text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-mute">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
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
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              autoComplete="name"
              error={errors.name}
            />
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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              error={errors.password}
              hint="Use at least 8 characters."
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
            <Input
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={errors.confirm}
            />
            <Button type="submit" size="lg" loading={submitting} fullWidth>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-faint">
            By signing up you agree to run code only inside CodeRunner's sandboxed containers.
          </p>
        </div>
      </div>
    </div>
  );
}