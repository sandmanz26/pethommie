import type { StayCounting, StayRules } from "@/app/domain/types";
import type { AppMessages } from "./en";

/** A stay's length in the hotel's words: "3 nights" when it counts nights, "4 days" otherwise. */
export const stayCount = (t: Pick<AppMessages, "common">, n: number, counting: StayCounting = "nights") => (counting === "nights" ? t.common.nights(n) : t.common.days(n));

/** The drop-off and pick-up hours as a hint under a booking: "Drop-off 08:00–20:00 · pick up by 12:00". */
export const stayHoursHint = (t: Pick<AppMessages, "stayRules">, rules: StayRules) =>
  rules.counting === "hours24" ? t.stayRules.formHint24(rules.dropOffFrom, rules.dropOffUntil) : t.stayRules.formHint(rules.dropOffFrom, rules.dropOffUntil, rules.pickUpUntil);
