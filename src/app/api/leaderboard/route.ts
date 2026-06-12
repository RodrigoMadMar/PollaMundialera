import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, predictions, matches } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allUsers = await db.select().from(users);

    const leaderboard = await Promise.all(
      allUsers.map(async (user) => {
        const userPredictions = await db
          .select({
            predictedHome: predictions.predictedHome,
            predictedAway: predictions.predictedAway,
            homeScore: matches.homeScore,
            awayScore: matches.awayScore,
            finished: matches.finished,
          })
          .from(predictions)
          .innerJoin(matches, eq(predictions.matchId, matches.id))
          .where(
            and(
              eq(predictions.userId, user.id),
              eq(matches.finished, true),
              isNotNull(matches.homeScore),
              isNotNull(matches.awayScore),
              isNotNull(predictions.predictedHome),
              isNotNull(predictions.predictedAway)
            )
          );

        let points = 0;
        for (const p of userPredictions) {
          const actualHome = p.homeScore!;
          const actualAway = p.awayScore!;
          const predHome = p.predictedHome!;
          const predAway = p.predictedAway!;

          const exactScore = actualHome === predHome && actualAway === predAway;
          const actualWinner =
            actualHome > actualAway
              ? "home"
              : actualAway > actualHome
              ? "away"
              : "draw";
          const predWinner =
            predHome > predAway
              ? "home"
              : predAway > predHome
              ? "away"
              : "draw";
          const correctWinner = actualWinner === predWinner;

          if (exactScore) points += 5;
          else if (correctWinner) points += 3;
        }

        return { id: user.id, name: user.name, points };
      })
    );

    leaderboard.sort((a, b) => b.points - a.points);
    const ranked = leaderboard.map((entry, i) => ({ ...entry, rank: i + 1 }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
