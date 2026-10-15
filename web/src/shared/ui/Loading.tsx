import "./loading.css";

/** A calm placeholder while a screen's code loads. */
export function Loading({ label }: { label: string }) {
  return (
    <div className="loading" role="status">
      <span className="loading__dot" aria-hidden="true" />
      {label}
    </div>
  );
}
