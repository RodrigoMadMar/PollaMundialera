import { describe, it, expect } from "vitest";
import { calculatePoints, getMatchPhase } from "../lib/points";

describe("calculatePoints", () => {
  it("returns 5 for exact score in group stage", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 })).toBe(5);
  });

  it("returns 5 for exact score in group stage draw", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 1, awayScore: 1 })).toBe(5);
  });

  it("returns 3 for correct winner in group stage", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 0 })).toBe(3);
  });

  it("returns 3 for correct draw in group stage", () => {
    expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 0, awayScore: 0 })).toBe(3);
  });

  it("returns 0 for wrong winner", () => {
    expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 2, awayScore: 0 })).toBe(0);
  });

  it("returns 0 when predicted draw but actual win", () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 1, awayScore: 1 })).toBe(0);
  });

  it("uses semifinal exact-score points", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 1 },
        { homeScore: 2, awayScore: 1 },
        "semifinal"
      )
    ).toBe(28);
  });

  it("uses semifinal winner points", () => {
    expect(
      calculatePoints(
        { homeScore: 2, awayScore: 0 },
        { homeScore: 2, awayScore: 1 },
        "semifinal"
      )
    ).toBe(16);
  });

  it("uses final winner points", () => {
    expect(
      calculatePoints(
        { homeScore: 3, awayScore: 2 },
        { homeScore: 1, awayScore: 0 },
        "final"
      )
    ).toBe(25);
  });
});

describe("getMatchPhase", () => {
  it("maps the 2026 World Cup calendar positions to phases", () => {
    expect(getMatchPhase(72)).toBe("group");
    expect(getMatchPhase(73)).toBe("roundOf32");
    expect(getMatchPhase(89)).toBe("roundOf16");
    expect(getMatchPhase(97)).toBe("quarterfinal");
    expect(getMatchPhase(101)).toBe("semifinal");
    expect(getMatchPhase(103)).toBe("thirdPlace");
    expect(getMatchPhase(104)).toBe("final");
  });
});
