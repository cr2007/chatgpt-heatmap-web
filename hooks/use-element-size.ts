import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Tracks the size of an element: once before the first paint, so there is
 * no flash at the wrong size, then on every resize.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && (rect.width > 0 || rect.height > 0))
      setSize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
