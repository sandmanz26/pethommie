import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDocumentMeta } from "./useDocumentMeta";

const meta = (name: string) => document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? null;

describe("useDocumentMeta", () => {
  it("sets the title and meta tags", () => {
    renderHook(() => useDocumentMeta({ title: "Pethommie", description: "About", robots: "noindex", themeColor: "#fff" }));
    expect(document.title).toBe("Pethommie");
    expect(meta("description")).toBe("About");
    expect(meta("robots")).toBe("noindex");
    expect(meta("theme-color")).toBe("#fff");
  });

  it("puts everything back when the page goes away", () => {
    document.title = "Before";
    document.head.insertAdjacentHTML("beforeend", '<meta name="theme-color" content="#000">');
    const { unmount } = renderHook(() => useDocumentMeta({ title: "During", robots: "noindex", themeColor: "#fff" }));
    unmount();
    expect(document.title).toBe("Before");
    expect(meta("robots")).toBeNull();
    expect(meta("theme-color")).toBe("#000");
  });

  it("follows changes", () => {
    const { rerender } = renderHook(({ title }) => useDocumentMeta({ title }), { initialProps: { title: "One" } });
    rerender({ title: "Two" });
    expect(document.title).toBe("Two");
  });
});
