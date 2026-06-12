import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
export const dynamic = "force-dynamic";
export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE external_id IN (9000001, 9000002, 9000003, 9000004))`;
  const deleted = await sql`DELETE FROM matches WHERE external_id IN (9000001, 9000002, 9000003, 9000004) RETURNING id`;
  return NextResponse.json({ ok: true, deletedMatches: deleted.length });
}
