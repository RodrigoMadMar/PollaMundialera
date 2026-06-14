import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const nowRow = (await sql`SELECT NOW() AS now`) as Array<{ now: string }>;

    // All non-finished matches near "now", with timing diagnostics
    const candidates = (await sql`
      SELECT
        id, external_id, home_team, away_team, status, finished,
        kickoff, home_score, away_score, updated_at,
        EXTRACT(EPOCH FROM (NOW() - kickoff)) / 60 AS minutes_since_kickoff,
        EXTRACT(EPOCH FROM (NOW() - updated_at)) AS seconds_since_update
      FROM matches
      WHERE finished = false
        AND home_team != 'TBD' AND away_team != 'TBD'
        AND kickoff >= NOW() - INTERVAL '6 hours'
        AND kickoff <= NOW() + INTERVAL '6 hours'
      ORDER BY kickoff ASC
    `) as Array<Record<string, unknown>>;

    // What the live endpoint would return
    const liveWindow = (await sql`
      SELECT id, home_team, away_team, status, kickoff
      FROM matches
      WHERE (
        status IN ('IN_PLAY', 'LIVE', 'PAUSED')
        OR (finished = false AND kickoff <= NOW() AND kickoff >= NOW() - INTERVAL '3 hours')
      )
        AND home_team != 'TBD' AND away_team != 'TBD'
      ORDER BY kickoff ASC
    `) as Array<Record<string, unknown>>;

    return NextResponse.json({
      now: nowRow[0]?.now,
      hasApiKey: !!process.env.FOOTBALL_DATA_API_KEY,
      candidatesNearNow: candidates,
      liveWindowMatches: liveWindow,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
