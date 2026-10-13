import "./ui.css";

/** A single hand-drawn ink stroke used as a section divider. */
export function BrushLine() {
  return (
    <svg className="brushline" viewBox="0 0 1000 28" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M2 16 C 120 6, 260 22, 420 13 S 760 6, 998 15"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
