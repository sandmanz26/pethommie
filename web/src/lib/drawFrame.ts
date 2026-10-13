/**
 * Draws a film frame onto the canvas.
 * Landscape screens: cover-fit. Portrait screens: a wider crop so the scene
 * still reads, set slightly low; the paper colour fills the rest seamlessly.
 */
export function drawFrame(canvas: HTMLCanvasElement, img: HTMLImageElement, paper: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cw = canvas.width;
  const ch = canvas.height;
  const portrait = cw < ch;
  const cover = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const scale = portrait ? Math.min(cover, (cw / img.naturalWidth) * 1.7) : cover;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const y = portrait ? (ch - h) * 0.72 : (ch - h) / 2;

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, (cw - w) / 2, y, w, h);
}
