/** Scroll films. Each one is a Higgsfield video pre-split into 12 fps WebP frames under public/films/<id>/. */
export type FilmId = "ink" | "turntable";

export type Film = {
  id: FilmId;
  frameCount: number;
  durationSeconds: number;
  /** Background colour of the video, used to fill around the frame. Matches --paper for this film. */
  paper: string;
  frameSrc: (i: number) => string;
  /** A representative frame for the switcher thumbnail. */
  poster: string;
};

const frames = (id: FilmId) => (i: number) => `/films/${id}/f${String(i + 1).padStart(4, "0")}.webp`;

export const films: Record<FilmId, Film> = {
  // v1: sumi-e ink handscroll, 15 s (Seedance 2.5)
  ink: {
    id: "ink",
    frameCount: 181,
    durationSeconds: 15,
    paper: "#f2ede2",
    frameSrc: frames("ink"),
    poster: "/films/ink/f0084.webp",
  },
  // v2: flat illustrated pop-up turntable, 17.75 s: 9 HD keyframe-to-keyframe clips (Wan 3.0, 1080p)
  turntable: {
    id: "turntable",
    frameCount: 213,
    durationSeconds: 17.75,
    paper: "#f6ebd8",
    frameSrc: frames("turntable"),
    poster: "/films/turntable/f0205.webp",
  },
};

export const FILM_ORDER: FilmId[] = ["ink", "turntable"];
export const DEFAULT_FILM: FilmId = "ink";

