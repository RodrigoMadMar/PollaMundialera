import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, predictions, matches } from "@/lib/db/schema";
import { calculatePoints, getMatchPhase } from "@/lib/points";
import { eq, and, isNotNull, asc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allUsers = await db.select().from(users);
    const allMatches = await db
      .select({ id: matches.id })
      .from(matches)
      .where(sql`home_team != 'TBD' AND away_team != 'TBD'`)
      .orderBy(asc(matches.kickoff), asc(matches.id));
    const phaseByMatchId = new Map(
      allMatches.map((match, index) => [match.id, getMatchPhase(index + 1)])
    );

    const leaderboard = await Promise.all(
      allUsers.map(async (user) => {
        const userPredictions = await db
          .select({
            matchId: predictions.matchId,
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
          points += calculatePoints(
            { homeScore: p.homeScore!, awayScore: p.awayScore! },
            { homeScore: p.predictedHome!, awayScore: p.predictedAway! },
            phaseByMatchId.get(p.matchId!) ?? "group"
          );
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
