/**
 * Never show a frame larger than this many CSS pixels per frame pixel. Beyond it the film looks soft,
 * so the frame stops growing and the paper colour fills the rest (the film's ground is the same colour,
 * so the edge is invisible). Measured in CSS pixels, so a 2x screen shows the scene as large as a 1x one.
 */
const MAX_CSS_UPSCALE = 1.2;

/** A region of the canvas, in canvas pixels, that the scene should sit in. */
export type FrameBox = { x: number; y: number; w: number; h: number };
/** The part of a frame that matters, in frame pixels. */
export type Focus = { x: number; y: number; w: number; h: number };

/**
 * Draws a film frame onto the canvas so that its `focus` (default: the whole frame) sits centred in `box`
 * (default: the whole canvas).
 * - No focus: cover-fit the box, so a wide scene fills it edge to edge.
 * - A focus: contain-fit the focus in the box, so a small scene is shown large and whole.
 * Either way the frame may overhang the box: its edges are plain paper. `dpr` is the canvas's pixels per CSS pixel.
 */
export function drawFrame(canvas: HTMLCanvasElement, img: HTMLImageElement, paper: string, box?: FrameBox, focus?: Focus, dpr = 1) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cw = canvas.width;
  const ch = canvas.height;
  const b = box ?? { x: 0, y: 0, w: cw, h: ch };
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const f = focus ?? { x: 0, y: 0, w: iw, h: ih };
  const fit = focus ? Math.min(b.w / f.w, b.h / f.h) : Math.max(b.w / f.w, b.h / f.h);
  const scale = Math.min(fit, MAX_CSS_UPSCALE * dpr);

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = "high";
  // The focus's centre goes to the box's centre.
  const x = b.x + b.w / 2 - (f.x + f.w / 2) * scale;
  const y = b.y + b.h / 2 - (f.y + f.h / 2) * scale;
  ctx.drawImage(img, x, y, iw * scale, ih * scale);
}
