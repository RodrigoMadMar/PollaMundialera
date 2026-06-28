/**
 * Import predictions from a CSV file.
 *
 * CSV format:
 *   email,external_match_id,predicted_home,predicted_away,predicted_winner
 *
 * predicted_winner is optional and accepts home, away, draw, HOME_TEAM or AWAY_TEAM.
 * It is required for knockout predictions where the predicted score is tied.
 *
 * Usage:
 *   npx tsx scripts/import-predictions.ts predictions.csv
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getWinner, isKnockoutPhase, normalizeOutcome } from "../src/lib/points";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function importPredictions(csvPath: string) {
  const content = fs.readFileSync(path.resolve(csvPath), "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  // Skip header
  const rows = lines.slice(1).map((line) => {
    const [email, externalMatchId, predictedHome, predictedAway, predictedWinner] = line
      .split(",")
      .map((s) => s.trim());
    return {
      email,
      externalMatchId: parseInt(externalMatchId),
      predictedHome: parseInt(predictedHome),
      predictedAway: parseInt(predictedAway),
      predictedWinner: normalizeOutcome(predictedWinner),
    };
  });

  console.log(`📋 Importing ${rows.length} predictions...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, row.email))
        .limit(1);

      if (!user) {
        console.warn(`  ⚠ User not found: ${row.email}`);
        skipped++;
        continue;
      }

      const [match] = await db
        .select()
        .from(schema.matches)
        .where(eq(schema.matches.externalId, row.externalMatchId))
        .limit(1);

      if (!match) {
        console.warn(`  ⚠ Match not found: external_id=${row.externalMatchId}`);
        skipped++;
        continue;
      }

      const scoreWinner = getWinner({
        homeScore: row.predictedHome,
        awayScore: row.predictedAway,
      });
      let predictedWinner: "home" | "away" | "draw" | null = row.predictedWinner;

      if (isKnockoutPhase(match.phase)) {
        if (scoreWinner === "draw") {
          if (!predictedWinner || predictedWinner === "draw") {
            console.warn(
              `  ⚠ Missing qualifier for tied knockout prediction: ${user.name} — match ${match.id}`
            );
            skipped++;
            continue;
          }
        } else {
          predictedWinner = scoreWinner;
        }
      }

      const existing = await db
        .select()
        .from(schema.predictions)
        .where(
          and(
            eq(schema.predictions.userId, user.id),
            eq(schema.predictions.matchId, match.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.predictions)
          .set({
            predictedHome: row.predictedHome,
            predictedAway: row.predictedAway,
            predictedWinner,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.predictions.userId, user.id),
              eq(schema.predictions.matchId, match.id)
            )
          );
        console.log(`  ↻ Updated: ${user.name} — match ${match.id}`);
      } else {
        await db.insert(schema.predictions).values({
          userId: user.id,
          matchId: match.id,
          predictedHome: row.predictedHome,
          predictedAway: row.predictedAway,
          predictedWinner,
        });
        console.log(`  ✓ Inserted: ${user.name} — match ${match.id}`);
      }
      imported++;
    } catch (e) {
      console.error(`  ✗ Error on row: ${JSON.stringify(row)}`, e);
      errors++;
    }
  }

  console.log(
    `\n✅ Done. Imported: ${imported} | Skipped: ${skipped} | Errors: ${errors}`
  );
}

const csvFile = process.argv[2];
if (!csvFile) {
  console.error("Usage: npx tsx scripts/import-predictions.ts <file.csv>");
  process.exit(1);
}

importPredictions(csvFile).catch((e) => {
  console.error(e);
  process.exit(1);
});
