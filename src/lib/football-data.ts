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
  stage?: string | null;
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

function resolveOfficialScore(score: APIMatch["score"]): { home: number | null; away: number | null } {
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
  const { getWinner, normalizeOutcome, normalizePhase } = await import("@/lib/points");
  const { eq } = await import("drizzle-orm");

  const apiMatches = (await getWorldCupMatches()).filter(
    (m) => new Date(m.utcDate).getFullYear() >= 2026
  );

  const liveData = await fetchAPI(
    `/competitions/${COMPETITION}/matches?status=IN_PLAY,PAUSED,LIVE`
  );
  const liveMatches: APIMatch[] = (liveData.matches ?? []).filter(
    (m: APIMatch) => new Date(m.utcDate).getFullYear() >= 2026
  );

  const seen = new Set<number>();
  const toSync: APIMatch[] = [];
  for (const m of [...apiMatches, ...liveMatches]) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      toSync.push(m);
    }
  }

  for (const m of toSync) {
    const kickoff = new Date(m.utcDate);
    const resolved = resolveOfficialScore(m.score);
    const homeScore = resolved.home;
    const awayScore = resolved.away;
    const finished = m.status === "FINISHED";
    const phase = normalizePhase(m.stage);
    const scoreWinner =
      homeScore !== null && awayScore !== null
        ? getWinner({ homeScore, awayScore })
        : null;
    const winner = normalizeOutcome(m.score.winner) ?? (finished ? scoreWinner : null);

    const existing = await db
      .select()
      .from(matches)
      .where(eq(matches.externalId, m.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(matches).values({
        externalId: m.id,
        phase,
        homeTeam: m.homeTeam.name || "TBD",
        awayTeam: m.awayTeam.name || "TBD",
        kickoff,
        homeScore: homeScore ?? null,
        awayScore: awayScore ?? null,
        winner,
        status: m.status,
        finished,
      });
    } else {
      await db
        .update(matches)
        .set({
          phase,
          homeTeam: m.homeTeam.name || "TBD",
          awayTeam: m.awayTeam.name || "TBD",
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
          winner,
          status: m.status,
          finished,
          updatedAt: new Date(),
        })
        .where(eq(matches.externalId, m.id));
    }
  }

  return { total: apiMatches.length, synced: toSync.length };
}
