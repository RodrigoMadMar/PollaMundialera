import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { calculatePoints } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const liveMatches = await sql`
      SELECT id, home_team, away_team, home_score, away_score, status, kickoff
      FROM matches
      WHERE (
        status IN ('IN_PLAY', 'LIVE', 'PAUSED')
        OR (
          finished = false
          AND kickoff <= NOW()
          AND kickoff >= NOW() - INTERVAL '3 hours'
        )
      )
        AND home_team != 'TBD' AND away_team != 'TBD'
      ORDER BY kickoff ASC
    `;

    if (!liveMatches.length) {
      return NextResponse.json([]);
    }

    const matchIds = liveMatches.map((m) => m.id);

    const preds = await sql`
      SELECT p.match_id, p.predicted_home, p.predicted_away, u.name, u.email
      FROM predictions p
      JOIN users u ON u.id = p.user_id
      WHERE p.match_id = ANY(${matchIds})
    `;

    const result = liveMatches.map((match) => {
      const matchPreds = preds.filter((p) => p.match_id === match.id);
      const players = matchPreds.map((p) => {
        const pts =
          match.home_score !== null && match.away_score !== null
            ? calculatePoints(
                { homeScore: match.home_score, awayScore: match.away_score },
                { homeScore: p.predicted_home, awayScore: p.predicted_away }
              )
            : null;
        return {
          name: p.name,
          predictedHome: p.predicted_home,
          predictedAway: p.predicted_away,
          points: pts,
        };
      });

      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        homeScore: match.home_score,
        awayScore: match.away_score,
        status: match.status,
        kickoff: match.kickoff,
        players,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
