import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { syncMatches } from "@/lib/football-data";
import { asc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function fetchVisibleMatches() {
  return db
    .select()
    .from(matches)
    .where(sql`home_team != 'TBD' AND away_team != 'TBD'`)
    .orderBy(asc(matches.kickoff));
}

export async function GET() {
  try {
    try {
      await syncMatches();
    } catch (syncError) {
      console.error("Matches auto-sync error:", syncError);
    }

    const allMatches = await fetchVisibleMatches();
    return NextResponse.json(allMatches);
  } catch (error) {
    console.error("Matches error:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
