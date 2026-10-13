import type { Messages } from "../../i18n/en";

type ChapterData = Messages["chapters"][number];

/** A caption inscribed on the scroll, positioned at its moment in the film. */
export function Chapter({ chapter, top }: { chapter: ChapterData; top: string }) {
  return (
    <div className={`chapter chapter--${chapter.side}`} style={{ top }}>
      <div className="inscription">
        <span className="inscription__when">{chapter.when}</span>
        <h2>{chapter.title}</h2>
        <p>{chapter.body}</p>
      </div>
    </div>
  );
}
