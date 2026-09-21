import { useEffect, useRef } from 'react';

const MIN_FONT = 9;
const MAX_FONT = 28;

/**
 * Two-finger pinch-to-zoom on a container element. The pinch drives a numeric
 * value (e.g. editor font size) proportionally from its value at gesture start.
 * `touchmove` is preventDefault'ed only while two fingers are active so that
 * native page pinch-zoom is suppressed inside the container, not elsewhere.
 */
export function usePinchZoom<T extends HTMLElement>(getValue: () => number, setValue: (next: number) => void) {
  const ref = useRef<T | null>(null);
  const getRef = useRef(getValue);
  const setRef = useRef(setValue);
  getRef.current = getValue;
  setRef.current = setValue;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let active = false;
    let startDist = 0;
    let startValue = 0;

    const distance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        active = true;
        startDist = distance(e.touches);
        startValue = getRef.current();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active || e.touches.length < 2) return;
      e.preventDefault();
      const ratio = distance(e.touches) / startDist;
      const next = Math.round(startValue * ratio);
      setRef.current(Math.min(MAX_FONT, Math.max(MIN_FONT, next)));
    };

    const end = () => {
      active = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, []);

  return ref;
}