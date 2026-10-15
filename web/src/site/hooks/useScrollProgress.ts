import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onProgress` with 0..1 as the element scrolls past a sticky viewport
 * (0 = element top reaches viewport top, 1 = element bottom reaches viewport bottom).
 * Runs at most once per animation frame and never triggers a React render,
 * so scroll-driven drawing stays cheap.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
) {
  const callback = useRef(onProgress);
  callback.current = onProgress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -el.getBoundingClientRect().top;
      callback.current(total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref]);
}
