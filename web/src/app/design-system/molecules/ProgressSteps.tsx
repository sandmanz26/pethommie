import "./molecules.css";

/** "Step 2 of 3" with a thin bar. */
export function ProgressSteps({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="ds-progress">
      <span className="ds-progress__label">{label}</span>
      <div className="ds-progress__track" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current} aria-label={label}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`ds-progress__seg${i < current ? " is-done" : ""}`} />
        ))}
      </div>
    </div>
  );
}
