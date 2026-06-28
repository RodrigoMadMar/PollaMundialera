import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { calculatePredictionScore } from "@/lib/points";
import { syncMatches } from "@/lib/football-data";

export const dynamic = "force-dynamic";

// Auto-sync throttle: only call the external API once every 25s (across all users)
// and only when there's actually a match in its play window.
async function maybeAutoSync() {
  const sql = neon(process.env.DATABASE_URL!);
  // Is there a match currently in its play window? (started within last 3h, not finished)
  const active = (await sql`
    SELECT MAX(updated_at) AS last_update
    FROM matches
    WHERE finished = false
      AND kickoff <= NOW()
      AND kickoff >= NOW() - INTERVAL '3 hours'
      AND home_team != 'TBD' AND away_team != 'TBD'
  `) as Array<{ last_update: string | null }>;

  // No active match -> nothing to auto-sync, save the API call
  if (!active[0]?.last_update) return;

  const lastUpdate = new Date(active[0].last_update).getTime();
  const ageSeconds = (Date.now() - lastUpdate) / 1000;
  if (ageSeconds < 25) return; // synced recently by another request

  try {
    await syncMatches();
  } catch {
    // Swallow errors so the read still returns; sync will retry next poll
  }
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    await maybeAutoSync();

    const liveMatches = await sql`
      SELECT id, phase, home_team, away_team, home_score, away_score, winner, status, kickoff
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
      SELECT p.match_id, p.predicted_home, p.predicted_away, p.predicted_winner, u.name, u.email
      FROM predictions p
      JOIN users u ON u.id = p.user_id
      WHERE p.match_id = ANY(${matchIds})
    `;

    const result = liveMatches.map((match) => {
      const matchPreds = preds.filter((p) => p.match_id === match.id);
      const players = matchPreds.map((p) => {
        const breakdown =
          match.home_score !== null && match.away_score !== null
            ? calculatePredictionScore({
                phase: match.phase,
                actual: {
                  homeScore: match.home_score,
                  awayScore: match.away_score,
                  winner: match.winner,
                },
                predicted: {
                  homeScore: p.predicted_home,
                  awayScore: p.predicted_away,
                  winner: p.predicted_winner,
                },
              })
            : null;

        return {
          name: p.name,
          predictedHome: p.predicted_home,
          predictedAway: p.predicted_away,
          predictedWinner: p.predicted_winner,
          points: breakdown?.total ?? null,
          exactScorePoints: breakdown?.exactScorePoints ?? 0,
          outcomePoints: breakdown?.outcomePoints ?? 0,
        };
      });

      return {
        id: match.id,
        phase: match.phase,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        homeScore: match.home_score,
        awayScore: match.away_score,
        winner: match.winner,
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
