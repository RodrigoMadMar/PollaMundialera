import { describe, it, expect } from "vitest";
import { calculatePoints, calculatePredictionScore, normalizePhase } from "../lib/points";

describe("calculatePoints", () => {
  it("keeps group-stage exact score at 5 total points", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 })).toBe(5);
  });

  it("keeps group-stage exact draw at 5 total points", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 1, awayScore: 1 })).toBe(5);
  });

  it("keeps group-stage winner-only scoring at 3 points", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 0 })).toBe(3);
  });

  it("keeps group-stage draw-only scoring at 3 points", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 0, awayScore: 0 })).toBe(3);
  });

  it("returns 0 for wrong group-stage winner", () => {
    expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 2, awayScore: 0 })).toBe(0);
  });

  it("returns 10 for exact score and qualifier in round of 32", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 1, winner: "home" },
        { homeScore: 2, awayScore: 1, winner: "home" },
        "ROUND_OF_32"
      )
    ).toBe(10);
  });

  it("returns 6 for round-of-32 qualifier only", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 1, winner: "home" },
        { homeScore: 1, awayScore: 0, winner: "home" },
        "ROUND_OF_32"
      )
    ).toBe(6);
  });

  it("returns exact points for octavos, cuartos and semifinales only with the right qualifier", () => {
    expect(
      calculatePoints(
        { homeScore: 3, awayScore: 2, winner: "away" },
        { homeScore: 3, awayScore: 2, winner: "away" },
        "LAST_16"
      )
    ).toBe(14);
    expect(
      calculatePoints(
        { homeScore: 1, awayScore: 0, winner: "home" },
        { homeScore: 1, awayScore: 0, winner: "home" },
        "QUARTER_FINALS"
      )
    ).toBe(20);
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 2, winner: "away" },
        { homeScore: 2, awayScore: 2, winner: "away" },
        "SEMI_FINALS"
      )
    ).toBe(28);
  });

  it("returns 0 when tied knockout score is exact but penalties qualifier is wrong", () => {
    const result = calculatePredictionScore({
      phase: "ROUND_OF_32",
      actual: { homeScore: 1, awayScore: 1, winner: "home" },
      predicted: { homeScore: 1, awayScore: 1, winner: "away" },
    });

    expect(result.exactScore).toBe(true);
    expect(result.correctOutcome).toBe(false);
    expect(result.exactScorePoints).toBe(0);
    expect(result.outcomePoints).toBe(0);
    expect(result.total).toBe(0);
  });

  it("returns qualifier points only when tied knockout score is wrong but qualifier is right", () => {
    const result = calculatePredictionScore({
      phase: "ROUND_OF_32",
      actual: { homeScore: 2, awayScore: 2, winner: "home" },
      predicted: { homeScore: 1, awayScore: 1, winner: "home" },
    });

    expect(result.exactScorePoints).toBe(0);
    expect(result.outcomePoints).toBe(6);
    expect(result.total).toBe(6);
  });

  it("returns 40 for exact final score and champion without adding champion points", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 0, winner: "home" },
        { homeScore: 2, awayScore: 0, winner: "home" },
        "FINAL"
      )
    ).toBe(40);
  });

  it("returns 25 for final winner only", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 0, winner: "home" },
        { homeScore: 1, awayScore: 0, winner: "home" },
        "FINAL"
      )
    ).toBe(25);
  });

  it("normalizes common API phase names", () => {
    expect(normalizePhase("GROUP_STAGE")).toBe("GROUP_STAGE");
    expect(normalizePhase("LAST_32")).toBe("ROUND_OF_32");
    expect(normalizePhase("LAST_16")).toBe("ROUND_OF_16");
    expect(normalizePhase("SEMI_FINALS")).toBe("SEMI_FINALS");
  });
});
