import { useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Film } from "../../content/film";
import { useLocale } from "../../i18n/LocaleProvider";
import { drawFrame } from "../../lib/drawFrame";
import { nearestLoaded, useFrameSequence } from "../../hooks/useFrameSequence";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { Chapter } from "./Chapter";
import "./ink.css";

/** Scroll distance per second of film, in vh. The stage itself is 100vh tall. */
const VH_PER_SECOND = 48;
/** Where a caption sits relative to the moment it belongs to (vh below the scroll position). */
const CAPTION_OFFSET_VH = 35;
/** Frames needed before the loading veil lifts. */
const READY_FRAMES = 8;

/**
 * A sticky canvas that scrubs a film's frames with scroll, captions that drift
 * past it, and a story clock along the bottom. Remount it (key by film id) to switch films.
 */
export function InkFilm({ film, intro }: { film: Film; intro: ReactNode }) {
  const scrubVh = film.durationSeconds * VH_PER_SECOND;
  const trackVh = scrubVh + 100;
  const trackRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const { t } = useLocale();
  const current = useRef(-1);
  const wanted = useRef(0);

  const paint = useCallback((index: number, force = false) => {
    const canvas = canvasRef.current;
    if (!canvas || (!force && index === current.current)) return;
    const img = nearestLoaded(frames.current, index);
    if (!img) return;
    drawFrame(canvas, img, film.paper);
    current.current = index;
    // frames is a stable ref from the hook below; film is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { frames, loaded } = useFrameSequence(film.frameCount, film.frameSrc, (i) => {
    if (i === wanted.current || current.current === -1) paint(wanted.current, true);
  });

  useScrollProgress(trackRef, (p) => {
    wanted.current = Math.min(film.frameCount - 1, Math.floor(p * film.frameCount));
    paint(wanted.current);
    if (fillRef.current) fillRef.current.style.width = `${(p * 100).toFixed(2)}%`;
    if (clockRef.current) {
      const seconds = p * film.durationSeconds;
      const clock = t.film.clock[film.id];
      const beat = [...clock].reverse().find((b) => seconds >= b.at) ?? clock[0];
      clockRef.current.textContent = beat.label;
    }
  });

  // Re-run the scroll handler when the language changes so the clock relabels.
  useEffect(() => {
    window.dispatchEvent(new Event("scroll"));
  }, [t]);

  // Keep the canvas backing store matched to its CSS size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      paint(wanted.current, true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  const ready = loaded >= READY_FRAMES;
  const percent = Math.round((loaded / film.frameCount) * 100);

  return (
    <section
      ref={trackRef}
      className="film"
      style={{ height: `${trackVh}vh` }}
      aria-label={t.film.ariaLabel}
    >
      <div className="film__stage">
        <canvas ref={canvasRef} className="film__canvas" aria-hidden="true" />
        <div className={`film__veil${ready ? " is-done" : ""}`} aria-hidden={ready}>
          <span>
            {t.film.loading}… {percent}%
          </span>
        </div>
        <div className="film__progress" aria-hidden="true">
          <span>{t.film.label}</span>
          <span className="film__rail">
            <span ref={fillRef} className="film__fill" />
          </span>
          {/* Text is set from the scroll handler, not by React. */}
          <span ref={clockRef} className="film__clock" />
        </div>
      </div>

      <div className="film__chapters">
        <div className="chapter" style={{ top: "16vh" }}>
          {intro}
        </div>
        {t.chapters[film.id].map((c) => (
          <Chapter
            key={c.at}
            chapter={c}
            top={`${(c.at / film.durationSeconds) * scrubVh + CAPTION_OFFSET_VH}vh`}
          />
        ))}
      </div>
    </section>
  );
}
