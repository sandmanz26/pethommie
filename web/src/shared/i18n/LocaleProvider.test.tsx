import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { LocaleProvider, useLocale } from "./LocaleProvider";

const wrapper = ({ children }: { children: ReactNode }) => <LocaleProvider>{children}</LocaleProvider>;

describe("LocaleProvider", () => {
  it("starts in English", () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("remembers the choice and tells the page its language", () => {
    const { result, unmount } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocale("id"));
    expect(document.documentElement.lang).toBe("id");
    expect(localStorage.getItem("pethommie.locale")).toBe("id");
    unmount();
    expect(renderHook(() => useLocale(), { wrapper }).result.current.locale).toBe("id");
  });

  it("ignores a stored language it doesn't know", () => {
    localStorage.setItem("pethommie.locale", "xx");
    expect(renderHook(() => useLocale(), { wrapper }).result.current.locale).toBe("en");
  });

  it("refuses to be used outside the provider", () => {
    expect(() => renderHook(() => useLocale())).toThrow(/LocaleProvider/);
  });
});
