/**
 * Never enlarge a frame past this factor of its own pixels. Beyond it, the film looks soft,
 * so the frame stays at this size and the paper colour fills the rest (the film's ground is the
 * same colour, so the edge is invisible).
 */
const MAX_UPSCALE = 1.25;

/** A region of the canvas, in canvas pixels, that the scene should sit in. */
export type FrameBox = { x: number; y: number; w: number; h: number };

/**
 * Draws a film frame onto the canvas, centred in `box` (defaults to the whole canvas).
 * Landscape screens: cover-fit the canvas (capped). Portrait screens: a wider crop so the scene
 * still reads, kept from spilling far past the box; the paper colour fills the rest seamlessly.
 */
export function drawFrame(canvas: HTMLCanvasElement, img: HTMLImageElement, paper: string, box?: FrameBox) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cw = canvas.width;
  const ch = canvas.height;
  const b = box ?? { x: 0, y: 0, w: cw, h: ch };
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const cover = Math.max(cw / iw, ch / ih);
  // The frame's top and bottom edges are plain paper, so it may overhang the box a little.
  const fit = cw < ch ? Math.min(cover, (b.w / iw) * 1.7, (b.h * 1.15) / ih) : cover;
  const scale = Math.min(fit, MAX_UPSCALE);
  const w = iw * scale;
  const h = ih * scale;

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = "high";
  // When the frame is taller than the box, let it hang mostly downward: the top stays clear of the
  // top bar, and the paper below the scene slides under the caption deck.
  const spill = h - b.h;
  const y = spill > 0 ? b.y - spill * 0.25 : b.y + (b.h - h) / 2;
  ctx.drawImage(img, b.x + (b.w - w) / 2, y, w, h);
}
