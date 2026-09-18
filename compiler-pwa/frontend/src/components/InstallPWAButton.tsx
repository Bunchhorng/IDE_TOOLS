import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { Logo } from './Logo';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

export function InstallPWAButton({
  variant = 'secondary',
  size = 'lg',
  className,
}: {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { canInstall, isIOS, isSecure, install } = useInstallPrompt();
  const toast = useToast();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  if (!canInstall) return null;

  /** True when Chrome can never fire the native prompt on this origin. */
  const insecureHttp = !isSecure && !isIOS;

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
      toast.info(t('toast.install_blocked'), t('toast.install_blocked_desc'));
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)} type="button">
        <span>{t('install.button')}</span>
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('install.heading')}
        description={showIosHint ? t('install.ios_hint') : t('install.desc')}
        hideClose
        size="sm"
        footer={
          showIosHint ? (
            <Button variant="primary" size="md" className="w-full" onClick={() => setOpen(false)}>
              {t('general.got_it')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => setOpen(false)} disabled={busy}>
                {t('general.cancel')}
              </Button>
              <Button variant="primary" size="md" onClick={() => void handleConfirm()} disabled={busy}>
                {busy ? t('install.installing') : t('install.install')}
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-col items-center gap-3 pt-1 pb-3">
          <Logo size="lg" />
          {insecureHttp && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-ink">
              <Icon name="alertTriangle" size={15} className="mt-0.5 shrink-0 text-warning" />
              <span>{t('install.insecure_hint')}</span>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}