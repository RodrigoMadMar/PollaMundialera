import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
export const dynamic = "force-dynamic";
export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT DISTINCT home_team, away_team FROM matches WHERE finished = false ORDER BY home_team`;
  return NextResponse.json(rows);
}
