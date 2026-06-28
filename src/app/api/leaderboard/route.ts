import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, predictions, matches } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  PHASES,
  calculatePredictionScore,
  normalizePhase,
  type MatchPhase,
} from "@/lib/points";

export const dynamic = "force-dynamic";

interface MatchPointDetail {
  matchId: number;
  phase: MatchPhase;
  homeTeam: string;
  awayTeam: string;
  points: number;
  exactScorePoints: number;
  outcomePoints: number;
}

export async function GET() {
  try {
    const allUsers = await db.select().from(users);

    const leaderboard = await Promise.all(
      allUsers.map(async (user) => {
        const userPredictions = await db
          .select({
            matchId: matches.id,
            phase: matches.phase,
            homeTeam: matches.homeTeam,
            awayTeam: matches.awayTeam,
            predictedHome: predictions.predictedHome,
            predictedAway: predictions.predictedAway,
            predictedWinner: predictions.predictedWinner,
            homeScore: matches.homeScore,
            awayScore: matches.awayScore,
            winner: matches.winner,
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
        const phasePoints = Object.fromEntries(
          PHASES.map((phase) => [phase, 0])
        ) as Record<MatchPhase, number>;
        const details: MatchPointDetail[] = [];

        for (const p of userPredictions) {
          const breakdown = calculatePredictionScore({
            phase: p.phase,
            actual: {
              homeScore: p.homeScore!,
              awayScore: p.awayScore!,
              winner: p.winner,
            },
            predicted: {
              homeScore: p.predictedHome!,
              awayScore: p.predictedAway!,
              winner: p.predictedWinner,
            },
          });

          points += breakdown.total;
          phasePoints[breakdown.phase] += breakdown.total;
          details.push({
            matchId: p.matchId,
            phase: normalizePhase(p.phase),
            homeTeam: p.homeTeam,
            awayTeam: p.awayTeam,
            points: breakdown.total,
            exactScorePoints: breakdown.exactScorePoints,
            outcomePoints: breakdown.outcomePoints,
          });
        }

        return { id: user.id, name: user.name, points, phasePoints, details };
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
