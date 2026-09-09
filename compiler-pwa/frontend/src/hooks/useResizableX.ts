import { useCallback, useRef, useState } from 'react';

interface UseResizableXOptions {
  initial: number;
  min?: number;
  max?: number;
}

export function useResizableX({ initial, min = 140, max }: UseResizableXOptions) {
  const [size, setSize] = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startSize = useRef(0);
  const dragMax = useRef(500);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startSize.current = collapsed ? initial : size;
      // Read the viewport at drag start so the clamp can't go stale after
      // window resizes (previously captured at render time).
      dragMax.current = max ?? (typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.4) : 500);

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
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
    [collapsed, initial, min, max, size],
  );

  const toggle = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  return {
    size: collapsed ? 0 : size,
    collapsed,
    onMouseDown,
    toggle,
  };
}
