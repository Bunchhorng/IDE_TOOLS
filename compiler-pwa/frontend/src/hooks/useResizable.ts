import { useCallback, useRef, useState } from 'react';

interface UseResizableOptions {
  initial: number;
  min?: number;
  max?: number;
  /** Start collapsed (e.g. on small screens where the terminal squeezes the editor). */
  initialCollapsed?: boolean;
}

/** Distance (px) a gesture must exceed before it's a resize rather than a tap. */
const DRAG_THRESHOLD = 3;

export function useResizable({ initial, min = 80, max, initialCollapsed = false }: UseResizableOptions) {
  const [size, setSize] = useState(initial);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startSize = useRef(0);
  const dragMax = useRef(600);
  /** Set when the pointer actually dragged; suppresses the post-drag click toggle. */
  const dragged = useRef(false);

  const beginDrag = useCallback(
    (clientY: number) => {
      dragged.current = false;
      dragging.current = true;
      startY.current = clientY;
      startSize.current = collapsed ? initial : size;
      // Read the viewport at drag start so the clamp can't go stale after
      // window resizes (previously captured at render time).
      dragMax.current = max ?? (typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.6) : 600);
    },
    [collapsed, initial, max, size],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      beginDrag(e.clientY);

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        if (Math.abs(startY.current - ev.clientY) > DRAG_THRESHOLD) dragged.current = true;
        const delta = startY.current - ev.clientY;
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

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [beginDrag, min, collapsed],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      beginDrag(e.touches[0]?.clientY ?? 0);

      const onTouchMove = (ev: TouchEvent) => {
        if (!dragging.current) return;
        const y = ev.touches[0]?.clientY;
        if (y === undefined) return;
        if (Math.abs(startY.current - y) > DRAG_THRESHOLD) dragged.current = true;
        // Only stop the page from scrolling once the gesture is a real drag.
        if (dragged.current) ev.preventDefault();
        const delta = startY.current - y;
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