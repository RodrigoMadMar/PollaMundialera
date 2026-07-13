import { describe, expect, it } from "vitest";
import {
  calculateWorldCupAwards,
  type AwardLeaderboardEntry,
  type AwardMatchDetail,
} from "../lib/awards";
import type { MatchPhase } from "../lib/points";

function detail(
  matchId: number,
  kickoff: string,
  phase: MatchPhase,
  points: number,
  exactScore = false
): AwardMatchDetail {
  return {
    matchId,
    kickoff,
    phase,
    points,
    exactScore,
    correctOutcome: points > 0,
    exactScorePoints: exactScore ? points : 0,
    outcomePoints: exactScore ? 0 : points,
  };
}

describe("calculateWorldCupAwards", () => {
  it("calculates streak, exact-score and knockout awards, including ties", () => {
    const leaderboard: AwardLeaderboardEntry[] = [
      {
        id: 1,
        name: "Ana",
        details: [
          detail(1, "2026-06-10T12:00:00Z", "GROUP_STAGE", 5, true),
          detail(2, "2026-07-01T12:00:00Z", "ROUND_OF_32", 10, true),
          detail(3, "2026-07-05T12:00:00Z", "ROUND_OF_16", 0),
          detail(4, "2026-07-10T12:00:00Z", "QUARTER_FINALS", 12),
        ],
      },
      {
        id: 2,
        name: "Beto",
        details: [
          detail(1, "2026-06-10T12:00:00Z", "GROUP_STAGE", 3),
          detail(2, "2026-07-01T12:00:00Z", "ROUND_OF_32", 0),
          detail(3, "2026-07-05T12:00:00Z", "ROUND_OF_16", 0),
          detail(4, "2026-07-10T12:00:00Z", "QUARTER_FINALS", 0),
        ],
      },
      {
        id: 3,
        name: "Carla",
        details: [
          detail(1, "2026-06-10T12:00:00Z", "GROUP_STAGE", 3),
          detail(2, "2026-07-01T12:00:00Z", "ROUND_OF_32", 6),
          detail(3, "2026-07-05T12:00:00Z", "ROUND_OF_16", 8),
          detail(4, "2026-07-10T12:00:00Z", "QUARTER_FINALS", 12),
        ],
      },
    ];

    const awards = calculateWorldCupAwards(leaderboard);
    const byId = Object.fromEntries(awards.map((award) => [award.id, award]));

    expect(byId.exactos.winners).toEqual(["Ana"]);
    expect(byId["racha-ganadora"].winners).toEqual(["Carla"]);
    expect(byId["racha-ganadora"].value).toBe("4 partidos");
    expect(byId["mata-mata"].winners).toEqual(["Carla"]);
    expect(byId.regularidad.value).toBe("100% de aciertos");
    expect(byId["racha-sufrida"].winners).toEqual(["Beto"]);
    expect(byId["menos-exactos"].winners).toEqual(["Beto", "Carla"]);
  });

  it("returns no awards before any finished prediction exists", () => {
    expect(
      calculateWorldCupAwards([{ id: 1, name: "Ana", details: [] }])
    ).toEqual([]);
  });
});
