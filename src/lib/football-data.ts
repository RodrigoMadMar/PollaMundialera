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

interface ScorePair {
  home: number | null;
  away: number | null;
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
    duration?: string | null;
    fullTime: ScorePair;
    halfTime?: ScorePair;
    regularTime?: ScorePair;
    extraTime?: ScorePair;
    penalties?: ScorePair;
  };
}

function hasScore(score?: ScorePair): score is { home: number; away: number } {
  return score?.home !== null &&
    score?.home !== undefined &&
    score?.away !== null &&
    score?.away !== undefined;
}

export function resolveOfficialScore(score: APIMatch["score"]): ScorePair {
  const decidedByPenalties =
    score.duration === "PENALTY_SHOOTOUT" ||
    (hasScore(score.penalties) &&
      (score.penalties.home > 0 || score.penalties.away > 0));

  if (!decidedByPenalties) {
    return score.fullTime;
  }

  if (hasScore(score.regularTime) && hasScore(score.extraTime)) {
    return {
      home: score.regularTime.home + score.extraTime.home,
      away: score.regularTime.away + score.extraTime.away,
    };
  }

  if (hasScore(score.fullTime) && hasScore(score.penalties)) {
    return {
      home: score.fullTime.home - score.penalties.home,
      away: score.fullTime.away - score.penalties.away,
    };
  }

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
  const existingMatches = await db.select().from(matches);
  const existingByExternalId = new Map(
    existingMatches
      .filter((match) => match.externalId !== null)
      .map((match) => [match.externalId!, match])
  );

  let changed = 0;

  for (const m of apiMatches) {
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
    const homeTeam = m.homeTeam.name || "TBD";
    const awayTeam = m.awayTeam.name || "TBD";
    const existing = existingByExternalId.get(m.id);

    if (!existing) {
      await db.insert(matches).values({
        externalId: m.id,
        phase,
        homeTeam,
        awayTeam,
        kickoff,
        homeScore: homeScore ?? null,
        awayScore: awayScore ?? null,
        winner,
        status: m.status,
        finished,
      });
      changed += 1;
      continue;
    }

    const matchChanged =
      existing.phase !== phase ||
      existing.homeTeam !== homeTeam ||
      existing.awayTeam !== awayTeam ||
      existing.kickoff.getTime() !== kickoff.getTime() ||
      existing.homeScore !== homeScore ||
      existing.awayScore !== awayScore ||
      existing.winner !== winner ||
      existing.status !== m.status ||
      existing.finished !== finished;

    if (matchChanged) {
      await db
        .update(matches)
        .set({
          phase,
          homeTeam,
          awayTeam,
          kickoff,
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
          winner,
          status: m.status,
          finished,
          updatedAt: new Date(),
        })
        .where(eq(matches.externalId, m.id));
      changed += 1;
    }
  }

  return { total: apiMatches.length, synced: apiMatches.length, changed };
}
