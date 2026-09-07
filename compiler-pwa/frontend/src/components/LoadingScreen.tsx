import { Logo } from './Logo';
import { Spinner } from './ui/Button';

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-page">
      <Logo size="lg" />
      <div className="flex items-center gap-2.5 text-mute">
        <Spinner size="sm" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}