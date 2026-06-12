import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Recreate tables with correct schema
    await sql`DROP TABLE IF EXISTS predictions CASCADE`;
    await sql`DROP TABLE IF EXISTS matches CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;

    await sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `;

    await sql`
      CREATE TABLE matches (
        id SERIAL PRIMARY KEY,
        external_id INTEGER UNIQUE,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        kickoff TIMESTAMP NOT NULL,
        home_score INTEGER,
        away_score INTEGER,
        status TEXT DEFAULT 'SCHEDULED',
        finished BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE predictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        match_id INTEGER REFERENCES matches(id),
        predicted_home INTEGER,
        predicted_away INTEGER,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, match_id)
      )
    `;

    // Seed users
    const userRows = [
      { name: "Rodrigo", email: "rodrigo.madariaga@alumni.ie.edu" },
      { name: "Benito",  email: "jbmartinez93@hotmail.com" },
      { name: "Daniel",  email: "danbrionesr@gmail.com" },
      { name: "MRB",     email: "marpandres1994@gmail.com" },
      { name: "Charlie", email: "carlos.rodriguezp@mail.udp.cl" },
    ];

    for (const u of userRows) {
      await sql`
        INSERT INTO users (name, email) VALUES (${u.name}, ${u.email})
        ON CONFLICT (email) DO NOTHING
      `;
    }

    // Seed demo matches
    const now = new Date();
    const past  = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
    const future = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

    const demoMatches = [
      { eid: 9000001, home: "Argentina", away: "Francia",   kick: past(50),   hs: 3,    as_: 3,    st: "FINISHED", fin: true  },
      { eid: 9000002, home: "Brasil",    away: "Alemania",  kick: past(26),   hs: 2,    as_: 1,    st: "FINISHED", fin: true  },
      { eid: 9000003, home: "España",    away: "Portugal",  kick: future(3),  hs: null, as_: null, st: "SCHEDULED", fin: false },
      { eid: 9000004, home: "Inglaterra",away: "Italia",    kick: future(27), hs: null, as_: null, st: "SCHEDULED", fin: false },
    ];

    for (const m of demoMatches) {
      await sql`
        INSERT INTO matches (external_id, home_team, away_team, kickoff, home_score, away_score, status, finished)
        VALUES (${m.eid}, ${m.home}, ${m.away}, ${m.kick}, ${m.hs}, ${m.as_}, ${m.st}, ${m.fin})
        ON CONFLICT (external_id) DO UPDATE SET
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          status = EXCLUDED.status,
          finished = EXCLUDED.finished,
          updated_at = NOW()
      `;
    }

    // Seed demo predictions
    const demoPreds = [
      { uEmail: "jbmartinez93@hotmail.com",            eid: 9000001, ph: 3, pa: 3 },
      { uEmail: "jbmartinez93@hotmail.com",            eid: 9000002, ph: 1, pa: 0 },
      { uEmail: "carlos.rodriguezp@mail.udp.cl",       eid: 9000001, ph: 1, pa: 0 },
      { uEmail: "carlos.rodriguezp@mail.udp.cl",       eid: 9000002, ph: 2, pa: 1 },
      { uEmail: "rodrigo.madariaga@alumni.ie.edu",     eid: 9000001, ph: 2, pa: 2 },
      { uEmail: "rodrigo.madariaga@alumni.ie.edu",     eid: 9000002, ph: 0, pa: 1 },
      { uEmail: "danbrionesr@gmail.com",               eid: 9000001, ph: 2, pa: 0 },
      { uEmail: "danbrionesr@gmail.com",               eid: 9000002, ph: 0, pa: 2 },
      { uEmail: "marpandres1994@gmail.com",            eid: 9000001, ph: 1, pa: 3 },
      { uEmail: "marpandres1994@gmail.com",            eid: 9000002, ph: 1, pa: 3 },
    ];

    for (const p of demoPreds) {
      await sql`
        INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
        SELECT u.id, m.id, ${p.ph}, ${p.pa}
        FROM users u, matches m
        WHERE u.email = ${p.uEmail} AND m.external_id = ${p.eid}
        ON CONFLICT (user_id, match_id) DO NOTHING
      `;
    }

    const users = await sql`SELECT name, email FROM users ORDER BY name`;
    const matchCount = await sql`SELECT COUNT(*) FROM matches`;
    const predCount  = await sql`SELECT COUNT(*) FROM predictions`;

    return NextResponse.json({
      ok: true,
      users: users.map((u: Record<string, unknown>) => u.name),
      matches: Number(matchCount[0].count),
      predictions: Number(predCount[0].count),
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
