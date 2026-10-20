// @vitest-environment node
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "@/site/i18n/en";
import { film } from "./film";

const PUBLIC = fileURLToPath(new URL("../../../public", import.meta.url));
const FPS = 12;

describe("the film", () => {
  const id = film.id;

  it("has exactly the frames it says it has, numbered without gaps", () => {
    const files = readdirSync(`${PUBLIC}/films/${id}`).filter((f) => /^f\d{4}\.webp$/.test(f)).sort();
    expect(files).toHaveLength(film.frameCount);
    expect(files[0]).toBe("f0001.webp");
    expect(files.at(-1)).toBe(`f${String(film.frameCount).padStart(4, "0")}.webp`);
    expect(film.frameSrc(0)).toBe("/films/" + id + "/f0001.webp");
  });

  it("has a frame count that matches its duration", () => {
    expect(Math.abs(film.frameCount - film.durationSeconds * FPS)).toBeLessThanOrEqual(1);
  });

  it("has a poster that exists, and a paper colour", () => {
    expect(existsSync(PUBLIC + film.poster)).toBe(true);
    expect(film.paper).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("places every caption inside the film, in order", () => {
    const at = en.chapters.map((c) => c.at);
    expect(at.length).toBeGreaterThan(0);
    at.forEach((t) => {
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(film.durationSeconds);
    });
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(new Set(at).size).toBe(at.length);
  });

  it("starts the story clock at zero and keeps it in order", () => {
    const at = en.film.clock.map((b) => b.at);
    expect(at[0]).toBe(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(at.at(-1)!).toBeLessThanOrEqual(film.durationSeconds);
  });
});
