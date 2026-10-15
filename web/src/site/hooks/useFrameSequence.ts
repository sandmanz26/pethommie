import { useEffect, useRef, useState } from "react";

/**
 * Preloads an image sequence. The first frame loads first, then frames at
 * coarse-to-fine intervals, so a fast scroller sees a rough version of the
 * whole film early instead of a sharp first half and a blank second half.
 */
export function useFrameSequence(
  count: number,
  src: (index: number) => string,
  onFrameLoaded?: (index: number) => void,
) {
  const frames = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(0);
  const onLoad = useRef(onFrameLoaded);
  onLoad.current = onFrameLoaded;

  useEffect(() => {
    const order: number[] = [];
    const seen = new Set<number>();
    for (const step of [30, 10, 3, 1]) {
      for (let i = 0; i < count; i += step) {
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      }
    }

    let cancelled = false;
    const list: HTMLImageElement[] = new Array(count);
    for (const i of order) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        setLoaded((n) => n + 1);
        onLoad.current?.(i);
      };
      img.src = src(i);
      list[i] = img;
    }
    frames.current = list;

    return () => {
      cancelled = true;
      for (const img of list) if (img) img.onload = null;
    };
    // src is expected to be a stable function from content config
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return { frames, loaded };
}

/** Nearest frame that has finished loading, searching outward from `index`. */
export function nearestLoaded(frames: HTMLImageElement[], index: number) {
  const ready = (img?: HTMLImageElement) => !!img && img.complete && img.naturalWidth > 0;
  if (ready(frames[index])) return frames[index];
  for (let d = 1; d < frames.length; d++) {
    if (ready(frames[index - d])) return frames[index - d];
    if (ready(frames[index + d])) return frames[index + d];
  }
  return undefined;
}
