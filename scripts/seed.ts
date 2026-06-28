import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const USERS = [
  { name: "Rodrigo", email: "rodrigo.madariaga@alumni.ie.edu" },
  { name: "Benito", email: "jbmartinez93@hotmail.com" },
  { name: "Daniel", email: "danbrionesr@gmail.com" },
  { name: "MRB", email: "marpandres1994@gmail.com" },
  { name: "Charlie", email: "carlos.rodriguezp@mail.udp.cl" },
];

async function seed() {
  console.log("🌱 Seeding users...");

  for (const user of USERS) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, user.email))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.users).values(user);
      console.log(`  ✓ Created user: ${user.name} (${user.email})`);
    } else {
      console.log(`  → User already exists: ${user.name}`);
    }
  }

  console.log("\n🌱 Seeding demo matches and predictions for initial state...");
  await seedDemoState();

  console.log("\n✅ Seed complete!");
}

async function seedDemoState() {
  const now = new Date();
  const past = (offsetHours: number) =>
    new Date(now.getTime() - offsetHours * 3600 * 1000);

  const demoMatches = [
    {
      externalId: 9000001,
      phase: "GROUP_STAGE",
      homeTeam: "Argentina",
      awayTeam: "Francia",
      kickoff: past(50),
      homeScore: 3,
      awayScore: 3,
      winner: "draw",
      status: "FINISHED",
      finished: true,
    },
    {
      externalId: 9000002,
      phase: "GROUP_STAGE",
      homeTeam: "Brasil",
      awayTeam: "Alemania",
      kickoff: past(26),
      homeScore: 2,
      awayScore: 1,
      winner: "home",
      status: "FINISHED",
      finished: true,
    },
    {
      externalId: 9000003,
      phase: "GROUP_STAGE",
      homeTeam: "España",
      awayTeam: "Portugal",
      kickoff: new Date(now.getTime() + 3 * 3600 * 1000),
      homeScore: null,
      awayScore: null,
      winner: null,
      status: "SCHEDULED",
      finished: false,
    },
    {
      externalId: 9000004,
      phase: "GROUP_STAGE",
      homeTeam: "Inglaterra",
      awayTeam: "Italia",
      kickoff: new Date(now.getTime() + 27 * 3600 * 1000),
      homeScore: null,
      awayScore: null,
      winner: null,
      status: "SCHEDULED",
      finished: false,
    },
  ];

  for (const m of demoMatches) {
    const existing = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.externalId, m.externalId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.matches).values(m);
      console.log(`  ✓ Match: ${m.homeTeam} vs ${m.awayTeam}`);
    } else {
      console.log(`  → Match already exists: ${m.homeTeam} vs ${m.awayTeam}`);
    }
  }

  const users = await db.select().from(schema.users);
  const matches = await db.select().from(schema.matches);

  const findUser = (name: string) => users.find((u) => u.name === name);
  const findMatch = (extId: number) => matches.find((m) => m.externalId === extId);

  // Initial state: Benito 8pts, Charlie 5pts, Rodrigo 3pts, Daniel 0pts, MRB 0pts
  // Match 1: Argentina 3-3 Francia (actual)
  // Match 2: Brasil 2-1 Alemania (actual)
  const demoPredictions = [
    // Benito: 8pts (exact on match1 + correct winner on match2)
    { userName: "Benito", extId: 9000001, home: 3, away: 3 },
    { userName: "Benito", extId: 9000002, home: 1, away: 0 },
    // Charlie: 5pts (exact on match2)
    { userName: "Charlie", extId: 9000001, home: 1, away: 0 },
    { userName: "Charlie", extId: 9000002, home: 2, away: 1 },
    // Rodrigo: 3pts (correct draw on match1)
    { userName: "Rodrigo", extId: 9000001, home: 2, away: 2 },
    { userName: "Rodrigo", extId: 9000002, home: 0, away: 1 },
    // Daniel: 0pts
    { userName: "Daniel", extId: 9000001, home: 2, away: 0 },
    { userName: "Daniel", extId: 9000002, home: 0, away: 2 },
    // MRB: 0pts
    { userName: "MRB", extId: 9000001, home: 1, away: 3 },
    { userName: "MRB", extId: 9000002, home: 1, away: 3 },
  ];

  for (const p of demoPredictions) {
    const user = findUser(p.userName);
    const match = findMatch(p.extId);
    if (!user || !match) continue;

    const existing = await db
      .select()
      .from(schema.predictions)
      .where(
        eq(schema.predictions.userId, user.id)
      )
      .limit(1);

    const alreadyForMatch = existing.find((e) => e.matchId === match.id);
    if (!alreadyForMatch) {
      await db.insert(schema.predictions).values({
        userId: user.id,
        matchId: match.id,
        predictedHome: p.home,
        predictedAway: p.away,
      });
    }
  }

  console.log("  ✓ Demo predictions inserted");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
