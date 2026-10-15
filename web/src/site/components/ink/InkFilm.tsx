import { useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Film } from "@/site/content/film";
import { useSiteT } from "@/site/i18n/useSiteT";
import { drawFrame, type FrameBox } from "@/site/lib/drawFrame";
import { nearestLoaded, useFrameSequence } from "@/site/hooks/useFrameSequence";
import { useScrollProgress } from "@/site/hooks/useScrollProgress";
import { Chapter, Inscription } from "./Chapter";
import "./ink.css";

/** Scroll distance per second of film, in vh. The stage itself is 100vh tall. */
const VH_PER_SECOND = 48;
/** Where a caption sits relative to the moment it belongs to (vh below the scroll position). */
const CAPTION_OFFSET_VH = 35;
/** Frames needed before the loading veil lifts. */
const READY_FRAMES = 8;
/** On phones a caption takes the deck this many seconds before its moment, so it is read while the scene plays. */
const DECK_LEAD_SECONDS = 1;
/** Gap between the scene and the caption deck, in CSS px. */
const DECK_GAP = 12;

/**
 * A sticky canvas that scrubs a film's frames with scroll, captions that drift
 * past it, and a story clock along the bottom. Remount it (key by film id) to switch films.
 *
 * On phones and portrait tablets (see ink.css) the drifting captions would cover the scene,
 * so the scene sits above a caption deck that shows the current chapter instead.
 */
export function InkFilm({ film, intro }: { film: Film; intro: ReactNode }) {
  const scrubVh = film.durationSeconds * VH_PER_SECOND;
  const trackVh = scrubVh + 100;
  const trackRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  /** Where the scene sits on the canvas; undefined = the whole canvas. */
  const box = useRef<FrameBox | undefined>(undefined);
  const { t } = useSiteT();
  const current = useRef(-1);
  const wanted = useRef(0);

  const paint = useCallback((index: number, force = false) => {
    const canvas = canvasRef.current;
    if (!canvas || (!force && index === current.current)) return;
    const img = nearestLoaded(frames.current, index);
    if (!img) return;
    drawFrame(canvas, img, film.paper, box.current);
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
    const deck = deckRef.current;
    if (deck) {
      const seconds = p * film.durationSeconds;
      const chapters = t.chapters[film.id];
      let active = -1;
      chapters.forEach((c, i) => {
        if (seconds >= c.at - DECK_LEAD_SECONDS) active = i;
      });
      [...deck.children].forEach((el, i) => el.classList.toggle("is-active", i === active));
    }
  });

  // Re-run the scroll handler when the language changes so the clock relabels.
  useEffect(() => {
    window.dispatchEvent(new Event("scroll"));
  }, [t]);

  // Keep the canvas backing store matched to its CSS size, and the scene clear of the caption deck.
  useEffect(() => {
    const canvas = canvasRef.current;
    const frameBox = frameBoxRef.current;
    const deck = deckRef.current;
    if (!canvas || !frameBox || !deck) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      if (getComputedStyle(deck).display === "none") {
        box.current = undefined;
      } else {
        const origin = canvas.getBoundingClientRect();
        const area = frameBox.getBoundingClientRect();
        const bottom = Math.min(area.bottom, deck.getBoundingClientRect().top - DECK_GAP);
        box.current = {
          x: (area.left - origin.left) * dpr,
          y: (area.top - origin.top) * dpr,
          w: area.width * dpr,
          h: Math.max(0, bottom - area.top) * dpr,
        };
      }
      paint(wanted.current, true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    observer.observe(deck);
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
        <div ref={frameBoxRef} className="film__framebox" aria-hidden="true" />
        {/* Phone layout only; the same captions are in .film__chapters for screen readers. */}
        <div ref={deckRef} className="film__deck" aria-hidden="true">
          {t.chapters[film.id].map((c) => (
            <div key={c.at} className="film__deck-item">
              <Inscription chapter={c} />
            </div>
          ))}
        </div>
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
        <div className="chapter chapter--intro">
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
