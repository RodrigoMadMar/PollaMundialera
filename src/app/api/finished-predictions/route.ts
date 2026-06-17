import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { calculatePoints } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const finishedMatches = (await sql`
      SELECT id, home_team, away_team, home_score, away_score, kickoff
      FROM matches
      WHERE finished = true
        AND home_score IS NOT NULL AND away_score IS NOT NULL
        AND home_team != 'TBD' AND away_team != 'TBD'
      ORDER BY kickoff DESC
    `) as Array<Record<string, unknown>>;

    if (!finishedMatches.length) return NextResponse.json([]);

    const matchIds = finishedMatches.map((m) => m.id);

    const preds = (await sql`
      SELECT p.match_id, p.predicted_home, p.predicted_away, u.name
      FROM predictions p
      JOIN users u ON u.id = p.user_id
      WHERE p.match_id = ANY(${matchIds})
    `) as Array<Record<string, unknown>>;

    const result = finishedMatches.map((match) => {
      const matchPreds = preds.filter((p) => p.match_id === match.id);
      const players = matchPreds.map((p) => ({
        name: p.name as string,
        predictedHome: p.predicted_home as number,
        predictedAway: p.predicted_away as number,
        points: calculatePoints(
          { homeScore: match.home_score as number, awayScore: match.away_score as number },
          { homeScore: p.predicted_home as number, awayScore: p.predicted_away as number }
        ),
      }));
      players.sort((a, b) => b.points - a.points);

      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        homeScore: match.home_score,
        awayScore: match.away_score,
        kickoff: match.kickoff,
        players,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
