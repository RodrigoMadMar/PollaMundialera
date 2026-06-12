import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { predictions, matches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser, isMatchLocked } from "@/lib/auth";

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

    const { matchId, predictedHome, predictedAway } = await request.json();

    if (
      typeof matchId !== "number" ||
      typeof predictedHome !== "number" ||
      typeof predictedAway !== "number" ||
      predictedHome < 0 ||
      predictedAway < 0
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
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

    const existing = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, matchId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(predictions)
        .set({ predictedHome, predictedAway, updatedAt: new Date() })
        .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, matchId)));
    } else {
      await db.insert(predictions).values({
        userId: user.id,
        matchId,
        predictedHome,
        predictedAway,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Predictions POST error:", error);
    return NextResponse.json({ error: "Error al guardar pronóstico" }, { status: 500 });
  }
}
