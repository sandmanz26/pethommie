import { describe, expect, it } from "vitest";
import { holdAfterConfirm, holdForNew, isValidDepositPercent, requiredDeposit } from "./policy";
import { holdsCage, isLive } from "./logic";
import type { PayPolicy } from "./types";

const policy = (mode: PayPolicy["mode"], depositPercent = 30): PayPolicy => ({ mode, depositPercent });

describe("requiredDeposit", () => {
  it("takes the percent of the price, rounded up to the next Rp1.000", () => {
    expect(requiredDeposit(200_000, 30)).toBe(60_000);
    expect(requiredDeposit(175_000, 30)).toBe(53_000); // 52.500 → 53.000
    expect(requiredDeposit(100_001, 100)).toBe(101_000);
    expect(requiredDeposit(1, 1)).toBe(1_000);
  });

  it("asks nothing when the percent or the price is zero", () => {
    expect(requiredDeposit(200_000, 0)).toBe(0);
    expect(requiredDeposit(0, 30)).toBe(0);
  });
});

describe("isValidDepositPercent", () => {
  it("takes whole numbers from 0 to 100", () => {
    expect([0, 30, 100].every(isValidDepositPercent)).toBe(true);
    expect([-1, 101, 2.5, NaN].some(isValidDepositPercent)).toBe(false);
  });
});

describe("holdForNew", () => {
  it("confirms right away in a flexible hotel, paid or not", () => {
    expect(holdForNew(policy("flexible"), 0, 200_000)).toBeUndefined();
  });

  it("waits for the deposit in a deposit-first hotel until enough is paid", () => {
    expect(holdForNew(policy("deposit_first"), 0, 200_000)).toBe("deposit");
    expect(holdForNew(policy("deposit_first"), 59_000, 200_000)).toBe("deposit");
    expect(holdForNew(policy("deposit_first"), 60_000, 200_000)).toBeUndefined();
    expect(holdForNew(policy("deposit_first", 0), 0, 200_000)).toBeUndefined();
  });

  it("makes every new booking a request in a check-first hotel, even one paid in full", () => {
    expect(holdForNew(policy("check_first"), 200_000, 200_000)).toBe("request");
  });
});

describe("holdAfterConfirm", () => {
  it("waits for the deposit after the slot is confirmed, unless it is paid or none is asked", () => {
    expect(holdAfterConfirm(policy("check_first"), 0, 200_000)).toBe("deposit");
    expect(holdAfterConfirm(policy("check_first"), 60_000, 200_000)).toBeUndefined();
    expect(holdAfterConfirm(policy("check_first", 0), 0, 200_000)).toBeUndefined();
    expect(holdAfterConfirm(policy("flexible"), 0, 200_000)).toBeUndefined();
  });
});

describe("what holds a place", () => {
  it("a request is still on, but holds no place; a stay waiting for its deposit does", () => {
    expect(isLive({ status: "booked", hold: "request" } as never)).toBe(true);
    expect(holdsCage({ status: "booked", hold: "request" })).toBe(false);
    expect(holdsCage({ status: "booked", hold: "deposit" })).toBe(true);
    expect(holdsCage({ status: "booked" })).toBe(true);
    expect(holdsCage({ status: "cancelled" })).toBe(false);
  });
});
