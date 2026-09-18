import { Logo } from './Logo';
import { Spinner } from './ui/Button';
import { useI18n } from '../i18n';

export function LoadingScreen({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-page">
      <Logo size="lg" />
      <div className="flex items-center gap-2.5 text-mute">
        <Spinner size="sm" />
        <span className="text-sm font-medium">{label ?? t('general.loading')}</span>
      </div>
    </div>
  );
}