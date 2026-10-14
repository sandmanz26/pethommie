import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { FILM_ORDER, films, type FilmId } from "../../content/film";
import { useLocale } from "../../i18n/LocaleProvider";
import "./film-switcher.css";

const POS_KEY = "pethommie.filmSwitcher.pos";
const MARGIN = 12;
const KEY_STEP = 24;

type Pos = { x: number; y: number };

function loadPos(): Pos | null {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
    return p && typeof p.x === "number" && typeof p.y === "number" ? p : null;
  } catch {
    return null;
  }
}

function savePos(p: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    // Position just won't be remembered.
  }
}

/** Floating, draggable V1/V2 switch for the hero film. Drag by the grip; arrow keys move it too. */
export function FilmSwitcher({ value, onChange }: { value: FilmId; onChange: (id: FilmId) => void }) {
  const { t } = useLocale();
  const s = t.film.switcher;
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<Pos | null>(loadPos);
  const [dragging, setDragging] = useState(false);

  /** Keep the panel fully on screen. */
  const clamp = useCallback((p: Pos): Pos => {
    const box = boxRef.current;
    const w = box?.offsetWidth ?? 0;
    const h = box?.offsetHeight ?? 0;
    return {
      x: Math.min(Math.max(MARGIN, p.x), window.innerWidth - w - MARGIN),
      y: Math.min(Math.max(MARGIN, p.y), window.innerHeight - h - MARGIN),
    };
  }, []);

  // Default spot: bottom-right, above the film progress line. Re-clamp on resize.
  useEffect(() => {
    const place = () =>
      setPos((p) => {
        const box = boxRef.current;
        const fallback = {
          x: window.innerWidth - (box?.offsetWidth ?? 0) - 20,
          y: window.innerHeight - (box?.offsetHeight ?? 0) - 64,
        };
        return clamp(p ?? fallback);
      });
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [clamp]);

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    setPos(clamp({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }));
  }

  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (pos) savePos(pos);
  }

  function onGripKey(e: KeyboardEvent<HTMLButtonElement>) {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || !pos) return;
    e.preventDefault();
    const next = clamp({ x: pos.x + d[0] * KEY_STEP, y: pos.y + d[1] * KEY_STEP });
    setPos(next);
    savePos(next);
  }

  return (
    <div
      ref={boxRef}
      className={`film-switcher${dragging ? " is-dragging" : ""}`}
      style={pos ? { left: pos.x, top: pos.y } : { visibility: "hidden" }}
      role="group"
      aria-label={s.label}
    >
      <button
        type="button"
        className="film-switcher__grip"
        aria-label={s.drag}
        title={s.drag}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onGripKey}
      >
        <span aria-hidden="true" />
      </button>
      <span className="film-switcher__label">{s.label}</span>
      <div className="film-switcher__options">
        {FILM_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className="film-switcher__option"
            aria-pressed={id === value}
            onClick={() => onChange(id)}
          >
            <img src={films[id].poster} alt="" width="40" height="24" />
            {s.options[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
