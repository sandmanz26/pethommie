import { describe, expect, it } from "vitest";
import { formatWhatsapp, normaliseWhatsapp } from "./phone";

describe("normaliseWhatsapp", () => {
  it.each([
    ["0812 3456 7890", "6281234567890"],
    ["0812-3456-7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["  0878 5551 2345 ", "6287855512345"],
  ])("accepts %s", (input, expected) => {
    expect(normaliseWhatsapp(input)).toBe(expected);
  });

  it.each([[""], ["abc"], ["0812"], ["021 555 1234"], ["+1 415 555 2671"], ["0812 3456 7890 1234 5678"]])("rejects %j", (input) => {
    expect(normaliseWhatsapp(input)).toBeNull();
  });
});

describe("formatWhatsapp", () => {
  it("shows the local format", () => {
    expect(formatWhatsapp("6281234567890")).toBe("0812 3456 7890");
    expect(formatWhatsapp("6287855512345")).toBe("0878 5551 2345");
  });

  it("leaves an empty number empty", () => {
    expect(formatWhatsapp("")).toBe("");
  });
});
