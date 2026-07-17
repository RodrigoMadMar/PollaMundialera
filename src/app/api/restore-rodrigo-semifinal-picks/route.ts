import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { calculatePredictionScore, getWinner } from "@/lib/points";

export const dynamic = "force-dynamic";

type Outcome = "home" | "away" | "draw";

type DBMatch = {
  id: number;
  phase: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  winner: Outcome | string | null;
};

type PickFix = {
  label: string;
  teamA: string;
  teamB: string;
  scores: Array<{ team: string; score: number }>;
};

const RODRIGO_EMAIL = "rodrigo.madariaga@alumni.ie.edu";

const PICKS: PickFix[] = [
  {
    label: "Argentina vs Inglaterra",
    teamA: "argentina",
    teamB: "inglaterra",
    scores: [
      { team: "argentina", score: 1 },
      { team: "inglaterra", score: 2 },
    ],
  },
  {
    label: "España vs Francia",
    teamA: "espana",
    teamB: "francia",
    scores: [
      { team: "espana", score: 2 },
      { team: "francia", score: 1 },
    ],
  },
];

const TEAM_VARIANTS: Record<string, string[]> = {
  argentina: ["argentina"],
  inglaterra: ["inglaterra", "england"],
  espana: ["espana", "spain"],
  francia: ["francia", "france"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function teamMatches(team: string, dbName: string) {
  const dbNorm = normalize(dbName);
  const variants = TEAM_VARIANTS[normalize(team)] ?? [team];
  return variants.some((variant) => normalize(variant) === dbNorm);
}

function scoreForTeam(dbName: string, pick: PickFix) {
  const score = pick.scores.find((item) => teamMatches(item.team, dbName));
  if (!score) throw new Error(`No score configured for ${dbName} in ${pick.label}`);
  return score.score;
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const users = await sql`SELECT id FROM users WHERE email = ${RODRIGO_EMAIL} LIMIT 1`;
    const userId = users[0]?.id;

    if (!userId) {
      return NextResponse.json({ error: "Rodrigo no existe en users" }, { status: 404 });
    }

    const matches = (await sql`
      SELECT id, phase, home_team, away_team, home_score, away_score, winner
      FROM matches
      WHERE home_team != 'TBD' AND away_team != 'TBD'
    `) as DBMatch[];

    const restored = [];

    for (const pick of PICKS) {
      const match = matches.find(
        (candidate) =>
          (teamMatches(pick.teamA, candidate.home_team) &&
            teamMatches(pick.teamB, candidate.away_team)) ||
          (teamMatches(pick.teamA, candidate.away_team) &&
            teamMatches(pick.teamB, candidate.home_team))
      );

      if (!match) {
        restored.push({ label: pick.label, ok: false, error: "Partido no encontrado" });
        continue;
      }

      const predictedHome = scoreForTeam(match.home_team, pick);
      const predictedAway = scoreForTeam(match.away_team, pick);
      const predictedWinner = getWinner({ homeScore: predictedHome, awayScore: predictedAway });

      await sql`
        INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away, predicted_winner)
        VALUES (${userId}, ${match.id}, ${predictedHome}, ${predictedAway}, ${predictedWinner})
        ON CONFLICT (user_id, match_id) DO UPDATE SET
          predicted_home = EXCLUDED.predicted_home,
          predicted_away = EXCLUDED.predicted_away,
          predicted_winner = EXCLUDED.predicted_winner,
          updated_at = NOW()
      `;

      const breakdown =
        match.home_score === null || match.away_score === null
          ? null
          : calculatePredictionScore({
              phase: match.phase,
              actual: {
                homeScore: match.home_score,
                awayScore: match.away_score,
                winner: match.winner,
              },
              predicted: {
                homeScore: predictedHome,
                awayScore: predictedAway,
                winner: predictedWinner,
              },
            });

      restored.push({
        label: pick.label,
        ok: true,
        matchId: match.id,
        phase: match.phase,
        match: `${match.home_team} ${match.home_score ?? ""}-${match.away_score ?? ""} ${match.away_team}`,
        prediction: `${match.home_team} ${predictedHome}-${predictedAway} ${match.away_team}`,
        predictedWinner,
        points: breakdown?.total ?? null,
      });
    }

    const totalPoints = restored.reduce(
      (sum, item) => sum + (item.ok && typeof item.points === "number" ? item.points : 0),
      0
    );

    return NextResponse.json({ ok: true, user: "Rodrigo", restored, totalPoints });
  } catch (error) {
    console.error("Restore Rodrigo semifinal picks error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
