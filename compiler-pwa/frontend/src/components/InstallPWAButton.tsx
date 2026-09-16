import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useToast } from '../context/ToastContext';
import { Logo } from './Logo';
import { Modal } from './ui/Modal';
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
  const { canInstall, isIOS, install } = useInstallPrompt();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  if (!canInstall) return null;

  const handleConfirm = async () => {
    // iOS has no install API — go straight to the only two taps that work.
    if (isIOS) {
      setShowIosHint(true);
      return;
    }
    setBusy(true);
    const didPrompt = await install();
    setBusy(false);
    if (didPrompt) {
      setOpen(false);
    } else {
      setOpen(false);
      toast.info(
        'Install pop-up blocked',
        'In Chrome, clear this site\'s data (⋮ → Site settings → Clear data), reopen, then tap "Install app".',
      );
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)} type="button">
        <span>Install app</span>
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Install CodeRunner"
        description={
          showIosHint
            ? 'In Safari, tap Share, then Add to Home Screen.'
            : 'Add CodeRunner to your home screen for quick, full-screen access.'
        }
        hideClose
        size="sm"
        footer={
          showIosHint ? (
            <Button variant="primary" size="md" className="w-full" onClick={() => setOpen(false)}>
              Got it
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={() => void handleConfirm()} disabled={busy}>
                {busy ? 'Installing…' : 'Install'}
              </Button>
            </>
          )
        }
      >
        <div className="flex items-center justify-center pt-1 pb-3">
          <Logo size="lg" />
        </div>
      </Modal>
    </>
  );
}