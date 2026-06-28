import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { predictions, matches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser, isMatchLocked } from "@/lib/auth";
import { getWinner, isKnockoutPhase, normalizeOutcome } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userPredictions = await db
      .select()
      .from(predictions)
      .where(eq(predictions.userId, user.id));

    return NextResponse.json(userPredictions);
  } catch (error) {
    console.error("Predictions GET error:", error);
    return NextResponse.json({ error: "Error al obtener pronósticos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { matchId, predictedHome, predictedAway } = body;
    const requestedWinner = normalizeOutcome(body.predictedWinner);

    if (
      typeof matchId !== "number" ||
      typeof predictedHome !== "number" ||
      typeof predictedAway !== "number" ||
      predictedHome < 0 ||
      predictedAway < 0
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (body.predictedWinner && !requestedWinner) {
      return NextResponse.json({ error: "Clasificado inválido" }, { status: 400 });
    }

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    if (isMatchLocked(match.kickoff)) {
      return NextResponse.json(
        { error: "El pronóstico está cerrado para este partido" },
        { status: 403 }
      );
    }

    const knockout = isKnockoutPhase(match.phase);
    const scoreWinner = getWinner({ homeScore: predictedHome, awayScore: predictedAway });
    let predictedWinner: "home" | "away" | "draw" | null = null;

    if (knockout) {
      if (scoreWinner === "draw") {
        if (!requestedWinner || requestedWinner === "draw") {
          return NextResponse.json(
            { error: "Debes elegir el equipo clasificado para esta llave" },
            { status: 400 }
          );
        }
        predictedWinner = requestedWinner;
      } else {
        predictedWinner = scoreWinner;
      }
    } else {
      predictedWinner = requestedWinner;
    }

    const existing = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, matchId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(predictions)
        .set({ predictedHome, predictedAway, predictedWinner, updatedAt: new Date() })
        .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, matchId)));
    } else {
      await db.insert(predictions).values({
        userId: user.id,
        matchId,
        predictedHome,
        predictedAway,
        predictedWinner,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Predictions POST error:", error);
    return NextResponse.json({ error: "Error al guardar pronóstico" }, { status: 500 });
  }
}
