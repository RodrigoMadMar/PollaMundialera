import { describe, expect, it } from "vitest";
import { resolveOfficialScore, type APIMatch } from "../lib/football-data";

type APIScore = APIMatch["score"];

describe("resolveOfficialScore", () => {
  it("uses the final 120-minute score instead of extra-time goals alone", () => {
    const score: APIScore = {
      winner: "HOME_TEAM",
      duration: "EXTRA_TIME",
      fullTime: { home: 3, away: 1 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 2, away: 0 },
      penalties: { home: null, away: null },
    };

    expect(resolveOfficialScore(score)).toEqual({ home: 3, away: 1 });
  });

  it("keeps the score before penalties", () => {
    const score: APIScore = {
      winner: "HOME_TEAM",
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 6, away: 5 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 5, away: 4 },
    };

    expect(resolveOfficialScore(score)).toEqual({ home: 1, away: 1 });
  });

  it("falls back to removing shootout goals from the full-time score", () => {
    const score: APIScore = {
      winner: "AWAY_TEAM",
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 4, away: 5 },
      penalties: { home: 3, away: 4 },
    };

    expect(resolveOfficialScore(score)).toEqual({ home: 1, away: 1 });
  });
});
