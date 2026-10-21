import type { Chapter as ChapterData, MomentKind } from "@/site/i18n/en";

/** The illustrated icon for each moment of the stay (public/icons/nav, shared with the app). */
const ICON: Record<MomentKind, string> = {
  profile: "customers",
  booking: "calendar",
  checkin: "bookings",
  care: "play",
  extra: "grooming",
  night: "night",
  report: "chat",
  pickup: "invoices",
};

/** The caption card: an icon, the title, and a line under it. */
export function Inscription({ chapter }: { chapter: ChapterData }) {
  return (
    <div className="inscription">
      <img className="inscription__icon" src={`/icons/nav/${ICON[chapter.moment]}.webp`} alt="" width="56" height="56" />
      <div>
        <h2>{chapter.title}</h2>
        <p>{chapter.body}</p>
      </div>
    </div>
  );
}

/**
 * One moment of the stay as shown beside the film: the caption, with a drawn phone showing that part of the app
 * tucked against its corner (an illustration in the film's style, not a screenshot).
 */
export function Chapter({ chapter }: { chapter: ChapterData }) {
  return (
    <div className="chapter">
      <Inscription chapter={chapter} />
      <img className={`chapter__art chapter__art--${chapter.moment}`} src={`/illustrations/moment-${chapter.moment}.webp`} alt="" width="200" height="260" loading="lazy" decoding="async" />
    </div>
  );
}
