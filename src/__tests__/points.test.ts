import { describe, it, expect } from "vitest";
import { calculatePoints, calculatePredictionScore, normalizePhase } from "../lib/points";

describe("calculatePoints", () => {
  it("keeps group-stage exact score at 5 total points", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 })).toBe(5);
  });

  it("keeps group-stage exact draw at 5 total points", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 1, awayScore: 1 })).toBe(5);
  });

  it("returns 3 for correct group-stage winner only", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 0 })).toBe(3);
  });

  it("returns 3 for correct group-stage draw only", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 0, awayScore: 0 })).toBe(3);
  });

  it("returns 0 for wrong group-stage winner", () => {
    expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 2, awayScore: 0 })).toBe(0);
  });

  it("uses round-of-32 exact and qualifier points", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 1, winner: "home" },
        { homeScore: 2, awayScore: 1, winner: "home" },
        "ROUND_OF_32"
      )
    ).toBe(16);
  });

  it("uses round-of-16 exact and qualifier points", () => {
    expect(
      calculatePoints(
        { homeScore: 3, awayScore: 2, winner: "away" },
        { homeScore: 3, awayScore: 2, winner: "away" },
        "LAST_16"
      )
    ).toBe(22);
  });

  it("awards exact score only when a tied knockout score has the wrong penalty qualifier", () => {
    const result = calculatePredictionScore({
      phase: "ROUND_OF_32",
      actual: { homeScore: 1, awayScore: 1, winner: "home" },
      predicted: { homeScore: 1, awayScore: 1, winner: "away" },
    });

    expect(result.exactScorePoints).toBe(10);
    expect(result.outcomePoints).toBe(0);
    expect(result.total).toBe(10);
  });

  it("awards qualifier only when the tied knockout score is wrong but qualifier is right", () => {
    const result = calculatePredictionScore({
      phase: "ROUND_OF_32",
      actual: { homeScore: 2, awayScore: 2, winner: "home" },
      predicted: { homeScore: 1, awayScore: 1, winner: "home" },
    });

    expect(result.exactScorePoints).toBe(0);
    expect(result.outcomePoints).toBe(6);
    expect(result.total).toBe(6);
  });

  it("weights the final more heavily", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 0, winner: "home" },
        { homeScore: 2, awayScore: 0, winner: "home" },
        "FINAL"
      )
    ).toBe(65);
  });

  it("normalizes common API phase names", () => {
    expect(normalizePhase("GROUP_STAGE")).toBe("GROUP_STAGE");
    expect(normalizePhase("LAST_32")).toBe("ROUND_OF_32");
    expect(normalizePhase("LAST_16")).toBe("ROUND_OF_16");
    expect(normalizePhase("SEMI_FINALS")).toBe("SEMI_FINALS");
  });
});
