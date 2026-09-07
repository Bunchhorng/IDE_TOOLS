import { useOnline } from '../hooks/useOnline';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';

export function OfflineBanner() {
  const online = useOnline();

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-1.5 text-warning">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
      </span>
      <span className="text-xs font-semibold">You're offline</span>
      <span className="hidden text-xs text-mute sm:inline">— code &amp; saved drafts keep working</span>
      <Button
        variant="ghost"
        size="xs"
        className="text-warning"
        onClick={() => window.location.reload()}
      >
        <Icon name="refresh" size={12} />
        Retry
      </Button>
    </div>
  );
}