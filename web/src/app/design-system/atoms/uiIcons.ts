import type { CareKind } from "@/app/domain/types";

/** The small illustrated icons in public/icons/ui (generated from resources/icons by scripts/prepare-resources.py). */
export const UI_ICONS = [
  "meal",
  "drink",
  "play",
  "toilet",
  "medicine",
  "mood",
  "note",
  "incident",
  "dog",
  "cat",
  "money",
  "bag",
  "report",
  "dog-house",
  "no-carrier",
  "reservation",
] as const;
export type UiIconName = (typeof UI_ICONS)[number];

/** Which icon stands for each kind of care entry. (Messages to owners use emoji: they are text.) */
export const CARE_ICON: Record<CareKind, UiIconName> = {
  meal: "meal",
  drink: "drink",
  play: "play",
  toilet: "toilet",
  medicine: "medicine",
  mood: "mood",
  note: "note",
  incident: "incident",
};
