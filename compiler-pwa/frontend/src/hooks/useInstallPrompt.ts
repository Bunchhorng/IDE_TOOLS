import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIPhone = /iphone/.test(ua);
  const isIPad = /ipad/.test(ua) || (/mac/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS 13+
  return isIPhone || isIPad;
}

// Captured at module scope so we never miss the early `beforeinstallprompt` event.
let modulePrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined' && 'onbeforeinstallprompt' in window) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    modulePrompt = e as BeforeInstallPromptEvent;
  });
}

async function waitForControl(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (navigator.serviceWorker.controller) return;
  // Chrome only fires `beforeinstallprompt` when the service worker controls
  // the page. On the very first load it may still be activating/claiming.
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(modulePrompt);
  const [installed, setInstalled] = useState(false);
  const isIOS = detectIOS();

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      modulePrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      modulePrompt = null;
      setDeferredPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const getPrompt = () => deferredPrompt ?? modulePrompt;
    // Ensure the service worker controls the page first, then wait for Chrome to
    // deliver `beforeinstallprompt`. The event can arrive moments after control.
    await waitForControl();
    let promptToUse = getPrompt();

    // `beforeinstallprompt` can fire a moment after the page loads; wait briefly for it so a
    // click always triggers the native install dialog on devices that support it.
    const deadline = Date.now() + 6000;
    while (!promptToUse && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      promptToUse = getPrompt();
    }

    if (!promptToUse) return false;
    await promptToUse.prompt();
    const choice = await promptToUse.userChoice;
    modulePrompt = null;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') setInstalled(true);
    return choice.outcome === 'accepted';
  }, [deferredPrompt]);

  // Show the button on any PWA-capable browser (iOS + any SW-capable browser), as long as the app
  // is not already installed. We intentionally do NOT require isSecureContext here so the install
  // action stays available on plain http LAN addresses (e.g. testing from a phone).
  const supportsPWA =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'HTMLElement' in window;
  const isStandalone =
    typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
  const canInstall = !installed && !isStandalone && (isIOS || supportsPWA);

  return { canInstall, canPrompt: !!(deferredPrompt ?? modulePrompt), isIOS, installed, install };
}
