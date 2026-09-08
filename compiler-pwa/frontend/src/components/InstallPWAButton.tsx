import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Logo } from './Logo';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';

export function InstallPWAButton({
  variant = 'secondary',
  size = 'lg',
  className,
}: {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { canInstall, install } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!canInstall) return null;

  const handleClick = () => {
    setOpen(true);
  };

  const handleInstall = async () => {
    setBusy(true);
    const didPrompt = await install();
    setBusy(false);
    if (didPrompt) setOpen(false);
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleClick} type="button">
        <span>Install app</span>
      </Button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col items-center gap-4 pb-2 text-center">
          <Logo size="lg" />
          <div>
            <h2 className="text-base font-semibold text-ink">Install CodeRunner</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-mute">
              Add CodeRunner to your device for quick, full-screen access.
            </p>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={() => void handleInstall()} disabled={busy}>
            {busy ? 'Installing…' : 'Install'}
          </Button>
          <button
            type="button"
            className="text-[13px] font-medium text-mute hover:text-ink"
            onClick={() => setOpen(false)}
          >
            Not now
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
