const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (id: string) => UUID.test(id);

/** 128 bits from a string: four FNV-1a hashes with different seeds. Not secure, just stable and well spread. */
function hash128(text: string): number[] {
  const words: number[] = [];
  for (let seed = 0; seed < 4; seed++) {
    let h = (0x811c9dc5 ^ (seed * 0x9e3779b1)) >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    words.push(h);
  }
  return words;
}

/**
 * The server needs real UUIDs. Records made by this app already have them; an old or hand-made id such as
 * "b1" gets a fixed one derived from it, the same every time, so everything that refers to it still lines up.
 * `scope` (the hotel) keeps two hotels that both have a "b1" from getting the same UUID.
 */
export function uuidFor(id: string, scope = ""): string {
  if (isUuid(id)) return id.toLowerCase();
  const hex = hash128(`pethommie:${scope}:${id}`).map((w) => w.toString(16).padStart(8, "0")).join("");
  // Mark it as version 4, variant 1, so it passes any UUID check.
  const v = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 32)}`;
  return `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20, 32)}`;
}
