import { describe, it, expect } from "vitest";
import { calculatePoints } from "../lib/points";

describe("calculatePoints", () => {
  it("returns 5 for exact score", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 })).toBe(5);
  });

  it("returns 5 for exact score — draw", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 1, awayScore: 1 })).toBe(5);
  });

  it("returns 3 for correct winner — home", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 0 })).toBe(3);
  });

  it("returns 3 for correct winner — away", () => {
    expect(calculatePoints({ homeScore: 0, awayScore: 2 }, { homeScore: 1, awayScore: 3 })).toBe(3);
  });

  it("returns 3 for correct draw", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 0, awayScore: 0 })).toBe(3);
  });

  it("returns 0 for wrong winner", () => {
    expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 2, awayScore: 0 })).toBe(0);
  });

  it("returns 0 when predicted draw but actual win", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 1, awayScore: 1 })).toBe(0);
  });

  // Spec examples
  it("2-1 → 2-1 = 5 pts", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 })).toBe(5);
  });

  it("1-0 predicted vs 3-2 actual = 3 pts", () => {
    expect(calculatePoints({ homeScore: 3, awayScore: 2 }, { homeScore: 1, awayScore: 0 })).toBe(3);
  });

  it("0-1 predicted vs 2-0 actual = 0 pts", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 0, awayScore: 1 })).toBe(0);
  });
});
