/** The scroll film: a Higgsfield video pre-split into 12 fps WebP frames under public/films/<id>/. */
export type FilmId = "turntable";

export type Film = {
  id: FilmId;
  frameCount: number;
  durationSeconds: number;
  /** Background colour of the video, used to fill around the frame. Matches --paper for this film. */
  paper: string;
  frameSrc: (i: number) => string;
  /** A representative frame, shown while the film loads. */
  poster: string;
  /**
   * Where the action is, in frame pixels. Given when the scene is small in its frame (the turntable is a little
   * diorama in the middle of a wide shot): that part is fitted into the scene area instead of the whole frame.
   */
  focus?: { x: number; y: number; w: number; h: number };
};

const frames = (id: FilmId) => (i: number) => `/films/${id}/f${String(i + 1).padStart(4, "0")}.webp`;

export const films: Record<FilmId, Film> = {
  // a flat illustrated pop-up turntable, 17.75 s: 9 HD keyframe-to-keyframe clips (Wan 3.0, 1080p), upscaled to 4K
  // (Topaz, same picture) and cropped around the diorama, so frames are 1800x1512 and sharp on 2x screens
  turntable: {
    id: "turntable",
    frameCount: 213,
    durationSeconds: 17.75,
    paper: "#f6ebd8",
    frameSrc: frames("turntable"),
    poster: "/films/turntable/f0205.webp",
    // the diorama, plus a margin, in these frames' pixels (the crop's edges are plain paper on every frame)
    focus: { x: 306, y: 162, w: 1152, h: 1278 },
  },
};

export const film = films.turntable;

