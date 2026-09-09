import { useCallback, useRef, useState } from 'react';

interface UseResizableOptions {
  initial: number;
  min?: number;
  max?: number;
}

export function useResizable({ initial, min = 80, max }: UseResizableOptions) {
  const [size, setSize] = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startSize = useRef(0);
  const dragMax = useRef(600);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startSize.current = collapsed ? initial : size;
      // Read the viewport at drag start so the clamp can't go stale after
      // window resizes (previously captured at render time).
      dragMax.current = max ?? (typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.6) : 600);

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
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
