const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION = "WC";

async function fetchAPI(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY!,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Football Data API error: ${res.status} — ${body}`);
  }

  return res.json();
}

export interface APIMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
  };
}

export async function getWorldCupMatches(): Promise<APIMatch[]> {
  const data = await fetchAPI(`/competitions/${COMPETITION}/matches`);
  return data.matches ?? [];
}

export async function getUpcomingMatches(): Promise<APIMatch[]> {
  const data = await fetchAPI(
    `/competitions/${COMPETITION}/matches?status=SCHEDULED,TIMED`
  );
  return data.matches ?? [];
}

export async function getFinishedMatches(): Promise<APIMatch[]> {
  const data = await fetchAPI(
    `/competitions/${COMPETITION}/matches?status=FINISHED`
  );
  return data.matches ?? [];
}

export async function syncMatches() {
  const { db } = await import("@/lib/db");
  const { matches } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const apiMatches = await getWorldCupMatches();

  // Only sync matches from 2026 onwards (filter out old World Cup editions)
  const wc2026 = apiMatches.filter(
    (m) => new Date(m.utcDate).getFullYear() >= 2026
  );

  for (const m of wc2026) {
    const kickoff = new Date(m.utcDate);
    const homeScore = m.score.fullTime.home;
    const awayScore = m.score.fullTime.away;
    const finished = m.status === "FINISHED";

    const existing = await db
      .select()
      .from(matches)
      .where(eq(matches.externalId, m.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(matches).values({
        externalId: m.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        kickoff,
        homeScore: homeScore ?? null,
        awayScore: awayScore ?? null,
        status: m.status,
        finished,
      });
    } else {
      await db
        .update(matches)
        .set({
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
          status: m.status,
          finished,
          updatedAt: new Date(),
        })
        .where(eq(matches.externalId, m.id));
    }
  }

  return { total: apiMatches.length, synced: wc2026.length };
}
