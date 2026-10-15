import type { Chapter as ChapterData } from "@/site/i18n/en";

/** The caption card: when, title, body. */
export function Inscription({ chapter }: { chapter: ChapterData }) {
  return (
    <div className="inscription">
      <span className="inscription__when">{chapter.when}</span>
      <h2>{chapter.title}</h2>
      <p>{chapter.body}</p>
    </div>
  );
}

/** A caption inscribed on the scroll, positioned at its moment in the film. */
export function Chapter({ chapter, top }: { chapter: ChapterData; top: string }) {
  return (
    <div className={`chapter chapter--story chapter--${chapter.side}`} style={{ top }}>
      <Inscription chapter={chapter} />
    </div>
  );
}
