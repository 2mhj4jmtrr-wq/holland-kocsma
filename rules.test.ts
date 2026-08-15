import { describe, expect, it } from "vitest";
import { canPlayOn, effectiveRank, trailingPhysicalSameRankCount } from "../src/engine/rules";
import { Card } from "../src/engine/types";

const c = (rank: Card["rank"], id = rank): Card => ({ id, rank, suit: "hearts" });

describe("Holland Kocsma rules", () => {
  it("allows equal or higher normal cards", () => {
    expect(canPlayOn(c("8"), [c("8", "x")])).toBe(true);
    expect(canPlayOn(c("9"), [c("8", "x")])).toBe(true);
    expect(canPlayOn(c("7"), [c("8", "x")])).toBe(false);
    expect(canPlayOn(c("K"), [c("K", "x")])).toBe(true);
    expect(canPlayOn(c("A"), [c("K", "x")])).toBe(true);
    expect(canPlayOn(c("Q"), [c("K", "x")])).toBe(false);
  });

  it("handles 7 special state", () => {
    for (const rank of ["2", "3", "4", "5", "6", "7", "10"] as const) {
      expect(canPlayOn(c(rank), [c("7", "x")])).toBe(true);
    }
    expect(canPlayOn(c("8"), [c("7", "x")])).toBe(false);
    expect(canPlayOn(c("A"), [c("7", "x")])).toBe(false);
  });

  it("3 copies the effective previous rank", () => {
    expect(effectiveRank([c("7", "a"), c("3", "b")])).toBe("7");
    expect(effectiveRank([c("7", "a"), c("3", "b"), c("3", "c")])).toBe("7");
    expect(effectiveRank([c("A", "a"), c("3", "b")])).toBe("A");
  });

  it("3 breaks the physical burn sequence", () => {
    expect(trailingPhysicalSameRankCount([c("A", "1"), c("A", "2"), c("A", "3"), c("3", "4")])).toBe(0);
    expect(trailingPhysicalSameRankCount([c("K", "1"), c("K", "2"), c("K", "3"), c("K", "4")])).toBe(4);
  });
});
