import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const now = new Date();
    const past = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

    // Restore the two demo finished matches representing first-day results
    const demoMatches = [
      { eid: 9000001, home: "Argentina", away: "Francia",  kick: past(50), hs: 3, as_: 3, st: "FINISHED", fin: true },
      { eid: 9000002, home: "Brasil",    away: "Alemania", kick: past(26), hs: 2, as_: 1, st: "FINISHED", fin: true },
    ];

    for (const m of demoMatches) {
      await sql`
        INSERT INTO matches (external_id, home_team, away_team, kickoff, home_score, away_score, status, finished)
        VALUES (${m.eid}, ${m.home}, ${m.away}, ${m.kick}, ${m.hs}, ${m.as_}, ${m.st}, ${m.fin})
        ON CONFLICT (external_id) DO UPDATE SET
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          status = EXCLUDED.status,
          finished = EXCLUDED.finished
      `;
    }

    // Predictions that produce: Benito 5pts, Charlie 5pts, Rodrigo 3pts, Daniel 0pts, MRB 0pts
    // Argentina 3-3 Francia (actual), Brasil 2-1 Alemania (actual)
    const demoPreds = [
      { email: "jbmartinez93@hotmail.com",            eid: 9000001, ph: 3, pa: 3 }, // exact → 5pts
      { email: "jbmartinez93@hotmail.com",            eid: 9000002, ph: 0, pa: 2 }, // wrong → 0pts  → total 5
      { email: "carlos.rodriguezp@mail.udp.cl",       eid: 9000001, ph: 1, pa: 0 }, // wrong → 0pts
      { email: "carlos.rodriguezp@mail.udp.cl",       eid: 9000002, ph: 2, pa: 1 }, // exact → 5pts  → total 5
      { email: "rodrigo.madariaga@alumni.ie.edu",     eid: 9000001, ph: 2, pa: 2 }, // draw correcto → 3pts
      { email: "rodrigo.madariaga@alumni.ie.edu",     eid: 9000002, ph: 0, pa: 1 }, // wrong → 0pts  → total 3
      { email: "danbrionesr@gmail.com",               eid: 9000001, ph: 2, pa: 0 }, // wrong → 0pts
      { email: "danbrionesr@gmail.com",               eid: 9000002, ph: 0, pa: 2 }, // wrong → 0pts  → total 0
      { email: "marpandres1994@gmail.com",            eid: 9000001, ph: 1, pa: 3 }, // wrong → 0pts
      { email: "marpandres1994@gmail.com",            eid: 9000002, ph: 1, pa: 3 }, // wrong → 0pts  → total 0
    ];

    for (const p of demoPreds) {
      await sql`
        INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
        SELECT u.id, m.id, ${p.ph}, ${p.pa}
        FROM users u, matches m
        WHERE u.email = ${p.email} AND m.external_id = ${p.eid}
        ON CONFLICT (user_id, match_id) DO NOTHING
      `;
    }

    return NextResponse.json({ ok: true, message: "Puntos del primer día restaurados" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
