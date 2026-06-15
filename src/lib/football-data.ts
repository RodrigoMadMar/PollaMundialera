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
    halfTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
}

function resolveScore(score: APIMatch["score"]): { home: number | null; away: number | null } {
  // Use the most advanced score available (penalties > extraTime > fullTime)
  if (score.penalties?.home !== null && score.penalties?.home !== undefined) return score.penalties;
  if (score.extraTime?.home !== null && score.extraTime?.home !== undefined) return score.extraTime;
  return score.fullTime;
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

  // Fetch matches from yesterday through tomorrow to catch live/recently finished games
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const data = await fetchAPI(
    `/competitions/${COMPETITION}/matches?dateFrom=${yesterday}&dateTo=${tomorrow}`
  );
  const todayMatches: APIMatch[] = (data.matches ?? []).filter(
    (m: APIMatch) => new Date(m.utcDate).getFullYear() >= 2026
  );

  // Also fetch live matches in case they started yesterday UTC
  const liveData = await fetchAPI(
    `/competitions/${COMPETITION}/matches?status=IN_PLAY,PAUSED,LIVE`
  );
  const liveMatches: APIMatch[] = (liveData.matches ?? []).filter(
    (m: APIMatch) => new Date(m.utcDate).getFullYear() >= 2026
  );

  // Merge, deduplicate by id
  const seen = new Set<number>();
  const toSync: APIMatch[] = [];
  for (const m of [...todayMatches, ...liveMatches]) {
    if (!seen.has(m.id)) { seen.add(m.id); toSync.push(m); }
  }

  for (const m of toSync) {
    const kickoff = new Date(m.utcDate);
    const resolved = resolveScore(m.score);
    const homeScore = resolved.home;
    const awayScore = resolved.away;
    const finished = m.status === "FINISHED";

    const existing = await db
      .select()
      .from(matches)
      .where(eq(matches.externalId, m.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(matches).values({
        externalId: m.id,
        homeTeam: m.homeTeam.name || "TBD",
        awayTeam: m.awayTeam.name || "TBD",
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
          homeTeam: m.homeTeam.name || "TBD",
          awayTeam: m.awayTeam.name || "TBD",
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
          status: m.status,
          finished,
          updatedAt: new Date(),
        })
        .where(eq(matches.externalId, m.id));
    }
  }

  return { synced: toSync.length };
}
