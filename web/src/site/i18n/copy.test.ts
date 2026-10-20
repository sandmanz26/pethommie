import { describe, expect, it } from "vitest";
import { shapeOf } from "@/test/shape";
import { en } from "./en";
import { id } from "./id";

describe("site copy", () => {
  it("has the same structure in every language", () => {
    expect(shapeOf(id)).toEqual(shapeOf(en));
  });

  it("times captions and the clock identically, because it is the same film", () => {
    const times = (m: typeof en) => ({
      chapters: m.chapters.map((c) => [c.at, c.moment]),
      clock: m.film.clock.map((b) => b.at),
    });
    expect(times(id)).toEqual(times(en));
  });

  it("has no empty strings", () => {
    const empty: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === "string" && v.trim() === "") empty.push(path);
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, `${path}.${k}`));
    };
    walk(en, "en");
    walk(id, "id");
    expect(empty).toEqual([]);
  });
});
