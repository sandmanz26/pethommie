import type { Chapter as ChapterData } from "@/site/i18n/en";
import { Moment } from "./Moment";

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

/** One moment of the stay as shown beside the film: the caption, and the app screen that goes with it. */
export function Chapter({ chapter }: { chapter: ChapterData }) {
  return (
    <>
      <Inscription chapter={chapter} />
      <Moment kind={chapter.moment} />
    </>
  );
}
