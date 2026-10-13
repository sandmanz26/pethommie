/** The ink film: 15 s generated with Higgsfield, extracted to 12 fps WebP frames. */
export const film = {
  frameCount: 181,
  durationSeconds: 15,
  frameSrc: (i: number) => `/frames/f${String(i + 1).padStart(4, "0")}.webp`,
};

/** The hanko mark: 宿, "inn". Same in every language. */
export const SEAL = "宿";
