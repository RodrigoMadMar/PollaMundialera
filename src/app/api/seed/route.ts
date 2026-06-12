import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, matches, predictions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const USERS = [
  { name: "Rodrigo", email: "rodrigo.madariaga@alumni.ie.edu" },
  { name: "Benito", email: "jbmartinez93@hotmail.com" },
  { name: "Daniel", email: "danbrionesr@gmail.com" },
  { name: "MRB", email: "marpandres1994@gmail.com" },
  { name: "Charlie", email: "carlos.rodriguezp@mail.udp.cl" },
];

export async function GET() {
  try {
    // Seed users
    for (const user of USERS) {
      const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values(user);
      }
    }

    // Demo matches
    const now = new Date();
    const past = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
    const future = (h: number) => new Date(now.getTime() + h * 3600 * 1000);

    const demoMatches = [
      { externalId: 9000001, homeTeam: "Argentina", awayTeam: "Francia", kickoff: past(50), homeScore: 3, awayScore: 3, status: "FINISHED", finished: true },
      { externalId: 9000002, homeTeam: "Brasil", awayTeam: "Alemania", kickoff: past(26), homeScore: 2, awayScore: 1, status: "FINISHED", finished: true },
      { externalId: 9000003, homeTeam: "España", awayTeam: "Portugal", kickoff: future(3), homeScore: null, awayScore: null, status: "SCHEDULED", finished: false },
      { externalId: 9000004, homeTeam: "Inglaterra", awayTeam: "Italia", kickoff: future(27), homeScore: null, awayScore: null, status: "SCHEDULED", finished: false },
    ];

    for (const m of demoMatches) {
      const existing = await db.select().from(matches).where(eq(matches.externalId, m.externalId)).limit(1);
      if (existing.length === 0) {
        await db.insert(matches).values(m);
      }
    }

    // Load inserted users and matches
    const allUsers = await db.select().from(users);
    const allMatches = await db.select().from(matches);

    const findUser = (name: string) => allUsers.find((u) => u.name === name);
    const findMatch = (extId: number) => allMatches.find((m) => m.externalId === extId);

    // Demo predictions → Benito 5pts, Charlie 5pts, Rodrigo 3pts, Daniel 0pts, MRB 0pts
    const demoPredictions = [
      { userName: "Benito",  extId: 9000001, home: 3, away: 3 },
      { userName: "Benito",  extId: 9000002, home: 1, away: 0 },
      { userName: "Charlie", extId: 9000001, home: 1, away: 0 },
      { userName: "Charlie", extId: 9000002, home: 2, away: 1 },
      { userName: "Rodrigo", extId: 9000001, home: 2, away: 2 },
      { userName: "Rodrigo", extId: 9000002, home: 0, away: 1 },
      { userName: "Daniel",  extId: 9000001, home: 2, away: 0 },
      { userName: "Daniel",  extId: 9000002, home: 0, away: 2 },
      { userName: "MRB",     extId: 9000001, home: 1, away: 3 },
      { userName: "MRB",     extId: 9000002, home: 1, away: 3 },
    ];

    for (const p of demoPredictions) {
      const user = findUser(p.userName);
      const match = findMatch(p.extId);
      if (!user || !match) continue;

      const existing = await db.select().from(predictions)
        .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, match.id)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(predictions).values({ userId: user.id, matchId: match.id, predictedHome: p.home, predictedAway: p.away });
      }
    }

    return NextResponse.json({ ok: true, message: "Seed completado" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
