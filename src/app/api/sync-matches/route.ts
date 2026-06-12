import { NextRequest, NextResponse } from "next/server";
import { syncMatches } from "@/lib/football-data";
import { revalidatePath } from "next/cache";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Remove old WC matches (pre-2026) that may have been synced previously.
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      DELETE FROM predictions
      WHERE match_id IN (
        SELECT id FROM matches
        WHERE external_id < 9000000
          AND kickoff < '2026-01-01'
      )
    `;
    const deleted = await sql`
      DELETE FROM matches
      WHERE external_id < 9000000
        AND kickoff < '2026-01-01'
      RETURNING id
    `;

    const result = await syncMatches();

    // If real 2026 matches were synced, remove demo placeholder upcoming matches
    if (result.synced > 0) {
      await sql`
        DELETE FROM predictions
        WHERE match_id IN (
          SELECT id FROM matches WHERE external_id >= 9000000 AND finished = false
        )
      `;
      await sql`
        DELETE FROM matches WHERE external_id >= 9000000 AND finished = false
      `;
    }

    revalidatePath("/");
    revalidatePath("/api/matches");
    revalidatePath("/api/leaderboard");
    return NextResponse.json({
      ok: true,
      deletedOldMatches: deleted.length,
      ...result,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
