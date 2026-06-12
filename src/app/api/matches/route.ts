import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allMatches = await db
      .select()
      .from(matches)
      .orderBy(asc(matches.kickoff));

    return NextResponse.json(allMatches);
  } catch (error) {
    console.error("Matches error:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
