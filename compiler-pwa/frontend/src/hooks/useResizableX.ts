import { useCallback, useRef, useState } from 'react';

interface UseResizableXOptions {
  initial: number;
  min?: number;
  max?: number;
}

/** Distance (px) a gesture must exceed before it's a resize rather than a tap. */
const DRAG_THRESHOLD = 3;

export function useResizableX({ initial, min = 140, max }: UseResizableXOptions) {
  const [size, setSize] = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startSize = useRef(0);
  const dragMax = useRef(500);
  /** Set when the pointer actually dragged; suppresses the post-drag click toggle. */
  const dragged = useRef(false);

  const beginDrag = useCallback(
    (clientX: number) => {
      dragged.current = false;
      dragging.current = true;
      startX.current = clientX;
      startSize.current = collapsed ? initial : size;
      // Read the viewport at drag start so the clamp can't go stale after
      // window resizes (previously captured at render time).
      dragMax.current = max ?? (typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.4) : 500);
    },
    [collapsed, initial, max, size],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      beginDrag(e.clientX);

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        if (Math.abs(startX.current - ev.clientX) > DRAG_THRESHOLD) dragged.current = true;
        const delta = ev.clientX - startX.current;
        const next = Math.min(dragMax.current, Math.max(min, startSize.current + delta));
        setSize(next);
        if (collapsed) setCollapsed(false);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [beginDrag, min, collapsed],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      beginDrag(e.touches[0]?.clientX ?? 0);

      const onTouchMove = (ev: TouchEvent) => {
        if (!dragging.current) return;
        const x = ev.touches[0]?.clientX;
        if (x === undefined) return;
        if (Math.abs(startX.current - x) > DRAG_THRESHOLD) dragged.current = true;
        // Only stop the page from scrolling once the gesture is a real drag.
        if (dragged.current) ev.preventDefault();
        const delta = x - startX.current;
        const next = Math.min(dragMax.current, Math.max(min, startSize.current + delta));
        setSize(next);
        if (collapsed) setCollapsed(false);
      };

      const onTouchEnd = () => {
        dragging.current = false;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.body.style.userSelect = '';
      };

      document.body.style.userSelect = 'none';
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
    },
    [beginDrag, min, collapsed],
  );

  const toggle = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  /** Tap = toggle; a drag that just ended does not also toggle. */
  const onClick = useCallback(() => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    toggle();
  }, [toggle]);

  return {
    size: collapsed ? 0 : size,
    collapsed,
    onMouseDown,
    onTouchStart,
    onClick,
    toggle,
  };
}