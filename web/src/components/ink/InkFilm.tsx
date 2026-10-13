import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { chapters, film } from "../../content/landing";
import { drawFrame } from "../../lib/drawFrame";
import { nearestLoaded, useFrameSequence } from "../../hooks/useFrameSequence";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { Chapter } from "./Chapter";
import "./ink.css";

/** Total height of the scroll track in vh. The stage is 100vh, so the film scrubs over the rest. */
const TRACK_VH = 820;
const SCRUB_VH = TRACK_VH - 100;
/** Where a caption sits relative to the moment it belongs to (vh below the scroll position). */
const CAPTION_OFFSET_VH = 35;
/** Frames needed before the loading veil lifts. */
const READY_FRAMES = 8;

const PAPER = "#f2ede2"; // keep in sync with --paper

/**
 * The emaki handscroll: a sticky canvas that scrubs the ink film with scroll,
 * captions that drift past it, and a story clock along the bottom.
 */
export function InkFilm({ intro }: { intro: ReactNode }) {
  const trackRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const current = useRef(-1);
  const wanted = useRef(0);

  const paint = useCallback((index: number, force = false) => {
    const canvas = canvasRef.current;
    if (!canvas || (!force && index === current.current)) return;
    const img = nearestLoaded(frames.current, index);
    if (!img) return;
    drawFrame(canvas, img, PAPER);
    current.current = index;
    // frames is a stable ref from the hook below
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
      const t = p * film.durationSeconds;
      const beat = [...film.clock].reverse().find((b) => t >= b.at) ?? film.clock[0];
      clockRef.current.textContent = beat.label;
    }
  });

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
      style={{ height: `${TRACK_VH}vh` }}
      aria-label="Perjalanan anabul selama menginap"
    >
      <div className="film__stage">
        <canvas ref={canvasRef} className="film__canvas" aria-hidden="true" />
        <div className={`film__veil${ready ? " is-done" : ""}`} aria-hidden={ready}>
          <span>Menyiapkan tinta… {percent}%</span>
        </div>
        <div className="film__progress" aria-hidden="true">
          <span>{film.label}</span>
          <span className="film__rail">
            <span ref={fillRef} className="film__fill" />
          </span>
          <span ref={clockRef} className="film__clock">
            {film.clock[0].label}
          </span>
        </div>
      </div>

      <div className="film__chapters">
        <div className="chapter" style={{ top: "16vh" }}>
          {intro}
        </div>
        {chapters.map((c) => (
          <Chapter
            key={c.when}
            chapter={c}
            top={`${(c.at / film.durationSeconds) * SCRUB_VH + CAPTION_OFFSET_VH}vh`}
          />
        ))}
      </div>
    </section>
  );
}
