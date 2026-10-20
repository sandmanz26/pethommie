import { useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Film } from "@/site/content/film";
import { useSiteT } from "@/site/i18n/useSiteT";
import { drawFrame, type FrameBox } from "@/site/lib/drawFrame";
import { nearestLoaded, useFrameSequence } from "@/site/hooks/useFrameSequence";
import { useScrollProgress } from "@/site/hooks/useScrollProgress";
import { Chapter } from "./Chapter";
import "./ink.css";

/** Scroll distance per second of film, in vh. The stage itself is 100vh tall. */
const VH_PER_SECOND = 40;
/** Frames needed before the loading veil lifts. */
const READY_FRAMES = 8;
/** A caption takes the deck this many seconds before its moment, so it is read while the scene plays. */
const DECK_LEAD_SECONDS = 1;
/** Gap between the scene and the caption deck on phones, in CSS px. */
const DECK_GAP = 12;

/**
 * A sticky canvas that scrubs a film's frames with scroll, a deck beside it that shows the opening (the hero)
 * and then the caption of the current moment with the app screen that goes with it, and a story clock along the
 * bottom.
 *
 * Wide screens: the deck is a column on the left and the scene fills the rest. Phones and portrait tablets
 * (see ink.css, `--stacked`): the scene sits above the deck. Screen readers get the captions as a list.
 */
export function InkFilm({ film, intro }: { film: Film; intro: ReactNode }) {
  const scrubVh = film.durationSeconds * VH_PER_SECOND;
  const trackVh = scrubVh + 100;
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  /** Where the scene sits on the canvas, and whether it is fitted by its focus; undefined = cover the canvas. */
  const box = useRef<{ box: FrameBox; focus: boolean } | undefined>(undefined);
  const dpr = useRef(1);
  const { t } = useSiteT();
  const chapters = t.chapters;
  const current = useRef(-1);
  const wanted = useRef(0);

  const paint = useCallback((index: number, force = false) => {
    const canvas = canvasRef.current;
    if (!canvas || (!force && index === current.current)) return;
    const img = nearestLoaded(frames.current, index);
    if (!img) return;
    const b = box.current;
    drawFrame(canvas, img, film.paper, b?.box, b?.focus ? film.focus : undefined, dpr.current);
    current.current = index;
    // frames is a stable ref from the hook below; film is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { frames, loaded } = useFrameSequence(film.frameCount, film.frameSrc, (i) => {
    if (i === wanted.current || current.current === -1) paint(wanted.current, true);
  });

  useScrollProgress(trackRef, (p) => {
    const seconds = p * film.durationSeconds;
    wanted.current = Math.min(film.frameCount - 1, Math.floor(p * film.frameCount));
    paint(wanted.current);
    if (fillRef.current) fillRef.current.style.width = `${(p * 100).toFixed(2)}%`;
    if (clockRef.current) {
      const clock = t.film.clock;
      const beat = [...clock].reverse().find((b) => seconds >= b.at) ?? clock[0];
      clockRef.current.textContent = beat.label;
    }
    const deck = deckRef.current;
    if (deck) {
      // 0 is the opening; chapter i is item i + 1.
      let active = 0;
      chapters.forEach((c, i) => {
        if (seconds >= c.at - DECK_LEAD_SECONDS) active = i + 1;
      });
      [...deck.children].forEach((el, i) => {
        el.classList.toggle("is-active", i === active);
        // The opening has links: out of sight, it must be out of the tab order too.
        if (i === 0) el.toggleAttribute("inert", active !== 0);
      });
    }
  });

  // Re-run the scroll handler when the language changes so the clock relabels.
  useEffect(() => {
    window.dispatchEvent(new Event("scroll"));
  }, [t]);

  // Keep the canvas backing store matched to its CSS size, and the scene in its area.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const frameBox = frameBoxRef.current;
    const deck = deckRef.current;
    if (!stage || !canvas || !frameBox || !deck) return;
    const resize = () => {
      dpr.current = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr.current);
      canvas.height = Math.round(canvas.clientHeight * dpr.current);
      const stacked = getComputedStyle(stage).getPropertyValue("--stacked").trim() === "1";
      const origin = canvas.getBoundingClientRect();
      const area = frameBox.getBoundingClientRect();
      const bottom = stacked ? Math.min(area.bottom, deck.getBoundingClientRect().top - DECK_GAP) : area.bottom;
      const inArea = {
        x: (area.left - origin.left) * dpr.current,
        y: (area.top - origin.top) * dpr.current,
        w: area.width * dpr.current,
        h: Math.max(0, bottom - area.top) * dpr.current,
      };
      // A wide scene covers the whole stage on a wide screen; a small one (with a focus) is fitted beside the deck.
      box.current = stacked || film.focus ? { box: inArea, focus: Boolean(film.focus) } : undefined;
      paint(wanted.current, true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    observer.observe(deck);
    return () => observer.disconnect();
    // film is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint]);

  const ready = loaded >= READY_FRAMES;
  const percent = Math.round((loaded / film.frameCount) * 100);

  return (
    <section ref={trackRef} className="film" style={{ height: `${trackVh}vh` }} aria-label={t.film.ariaLabel}>
      <div ref={stageRef} className="film__stage">
        <canvas ref={canvasRef} className="film__canvas" aria-hidden="true" />
        <div ref={frameBoxRef} className="film__framebox" aria-hidden="true" />
        <div ref={deckRef} className="film__deck">
          <div className="film__deck-item film__deck-item--intro is-active">{intro}</div>
          {chapters.map((c) => (
            <div key={c.at} className="film__deck-item" aria-hidden="true">
              <Chapter chapter={c} />
            </div>
          ))}
        </div>
        <div className={`film__veil${ready ? " is-done" : ""}`} aria-hidden={ready}>
          <span>
            {t.film.loading}… {percent}%
          </span>
        </div>
        <div className="film__progress">
          <span className="film__label" aria-hidden="true">
            {t.film.label}
          </span>
          <span className="film__rail" aria-hidden="true">
            <span ref={fillRef} className="film__fill" />
            {chapters.map((c) => (
              <i key={c.at} className="film__tick" style={{ left: `${(c.at / film.durationSeconds) * 100}%` }} />
            ))}
          </span>
          {/* Text is set from the scroll handler, not by React. */}
          <span ref={clockRef} className="film__clock" aria-hidden="true" />
          <a className="film__skip" href="#tour">
            {t.film.skip} ↓
          </a>
        </div>
      </div>

      {/* The captions, for screen readers: on screen they are drawn in the deck. */}
      <ol className="film__script">
        {chapters.map((c) => (
          <li key={c.at}>
            {c.title} {c.body}
          </li>
        ))}
      </ol>
    </section>
  );
}
