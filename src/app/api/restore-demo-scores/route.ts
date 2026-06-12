import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

// Predictions for the first two real WC 2026 matches.
// Actual results: México 2-0 South Africa, South Korea 2-1 Czechia
// Targets: Benito 5pts, Charlie 5pts, Rodrigo 3pts, Daniel 0pts, MRB 0pts
//
// Distribution:
//   Match 1 (México 2-0 SA):  Benito 2-0 (exact=5), Rodrigo 1-0 (winner=3), rest wrong
//   Match 2 (SKorea 2-1 CZE): Charlie 2-1 (exact=5), rest wrong
const PREDS_MATCH1 = [
  { email: "jbmartinez93@hotmail.com",        ph: 2, pa: 0 }, // exact → 5pts
  { email: "carlos.rodriguezp@mail.udp.cl",   ph: 0, pa: 1 }, // wrong → 0pts
  { email: "rodrigo.madariaga@alumni.ie.edu", ph: 1, pa: 0 }, // winner → 3pts
  { email: "danbrionesr@gmail.com",           ph: 0, pa: 1 }, // wrong → 0pts
  { email: "marpandres1994@gmail.com",        ph: 1, pa: 2 }, // wrong → 0pts
];
const PREDS_MATCH2 = [
  { email: "jbmartinez93@hotmail.com",        ph: 0, pa: 2 }, // wrong → 0pts
  { email: "carlos.rodriguezp@mail.udp.cl",   ph: 2, pa: 1 }, // exact → 5pts
  { email: "rodrigo.madariaga@alumni.ie.edu", ph: 0, pa: 2 }, // wrong → 0pts
  { email: "danbrionesr@gmail.com",           ph: 1, pa: 0 }, // wrong → 0pts
  { email: "marpandres1994@gmail.com",        ph: 0, pa: 0 }, // wrong → 0pts
];

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // First, delete the fake demo matches (Argentina/Francia, Brasil/Alemania)
    await sql`DELETE FROM predictions WHERE match_id IN (
      SELECT id FROM matches WHERE external_id IN (9000001, 9000002, 9000003, 9000004)
    )`;
    await sql`DELETE FROM matches WHERE external_id IN (9000001, 9000002, 9000003, 9000004)`;

    // Find the real first-day matches by team names (as synced from Football Data API)
    const match1 = await sql`
      SELECT id FROM matches
      WHERE (home_team ILIKE '%mexico%' OR home_team ILIKE '%méxico%')
        AND (away_team ILIKE '%south africa%' OR away_team ILIKE '%sudafric%')
      LIMIT 1
    `;
    const match2 = await sql`
      SELECT id FROM matches
      WHERE (home_team ILIKE '%korea%' OR home_team ILIKE '%corea%')
        AND (away_team ILIKE '%czech%' OR away_team ILIKE '%chequi%')
      LIMIT 1
    `;

    const m1id = match1[0]?.id;
    const m2id = match2[0]?.id;

    if (!m1id || !m2id) {
      return NextResponse.json({
        error: "No se encontraron los partidos reales. Sincroniza primero.",
        match1Found: !!m1id,
        match2Found: !!m2id,
      }, { status: 404 });
    }

    for (const p of PREDS_MATCH1) {
      await sql`
        INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
        SELECT u.id, ${m1id}, ${p.ph}, ${p.pa}
        FROM users u WHERE u.email = ${p.email}
        ON CONFLICT (user_id, match_id) DO UPDATE SET
          predicted_home = EXCLUDED.predicted_home,
          predicted_away = EXCLUDED.predicted_away
      `;
    }

    for (const p of PREDS_MATCH2) {
      await sql`
        INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
        SELECT u.id, ${m2id}, ${p.ph}, ${p.pa}
        FROM users u WHERE u.email = ${p.email}
        ON CONFLICT (user_id, match_id) DO UPDATE SET
          predicted_home = EXCLUDED.predicted_home,
          predicted_away = EXCLUDED.predicted_away
      `;
    }

    return NextResponse.json({
      ok: true,
      message: "Puntos del primer día restaurados sobre partidos reales",
      match1Id: m1id,
      match2Id: m2id,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
