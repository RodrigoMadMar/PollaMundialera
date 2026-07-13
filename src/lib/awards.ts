import type { MatchPhase } from "./points";

export interface AwardMatchDetail {
  matchId: number;
  phase: MatchPhase;
  kickoff: string;
  points: number;
  exactScore: boolean;
  correctOutcome: boolean;
  exactScorePoints: number;
  outcomePoints: number;
}

export interface AwardLeaderboardEntry {
  id: number;
  name: string;
  details?: AwardMatchDetail[];
}

export type AwardId =
  | "exactos"
  | "racha-ganadora"
  | "mata-mata"
  | "regularidad"
  | "racha-sufrida"
  | "menos-exactos";

export interface WorldCupAward {
  id: AwardId;
  title: string;
  description: string;
  winners: string[];
  value: string;
}

interface ScoredEntry {
  entry: AwardLeaderboardEntry;
  score: number;
}

function longestStreak(
  details: AwardMatchDetail[],
  predicate: (detail: AwardMatchDetail) => boolean
): number {
  let longest = 0;
  let current = 0;

  for (const detail of [...details].sort((a, b) =>
    a.kickoff.localeCompare(b.kickoff)
  )) {
    if (predicate(detail)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function awardWinners(
  entries: AwardLeaderboardEntry[],
  score: (entry: AwardLeaderboardEntry) => number,
  direction: "max" | "min" = "max"
): ScoredEntry[] {
  const scored = entries.map((entry) => ({ entry, score: score(entry) }));
  const target =
    direction === "max"
      ? Math.max(...scored.map(({ score }) => score))
      : Math.min(...scored.map(({ score }) => score));

  return scored.filter(({ score }) => score === target);
}

function makeAward(
  id: AwardId,
  title: string,
  description: string,
  scored: ScoredEntry[],
  value: (score: number) => string
): WorldCupAward {
  return {
    id,
    title,
    description,
    winners: scored.map(({ entry }) => entry.name),
    value: value(scored[0]?.score ?? 0),
  };
}

export function calculateWorldCupAwards(
  leaderboard: AwardLeaderboardEntry[]
): WorldCupAward[] {
  const entries = leaderboard.filter((entry) => (entry.details?.length ?? 0) > 0);
  if (!entries.length) return [];

  const exactos = awardWinners(
    entries,
    (entry) => entry.details!.filter((detail) => detail.exactScore).length
  );
  const rachaGanadora = awardWinners(entries, (entry) =>
    longestStreak(entry.details!, (detail) => detail.points > 0)
  );
  const mataMata = awardWinners(entries, (entry) =>
    entry.details!
      .filter((detail) => detail.phase !== "GROUP_STAGE")
      .reduce((total, detail) => total + detail.points, 0)
  );
  const regularidad = awardWinners(entries, (entry) => {
    const acertados = entry.details!.filter((detail) => detail.points > 0).length;
    return Math.round((acertados / entry.details!.length) * 100);
  });
  const rachaSufrida = awardWinners(entries, (entry) =>
    longestStreak(entry.details!, (detail) => detail.points === 0)
  );
  const menosExactos = awardWinners(
    entries,
    (entry) => entry.details!.filter((detail) => detail.exactScore).length,
    "min"
  );

  return [
    makeAward(
      "exactos",
      "Francotirador",
      "Más marcadores exactos",
      exactos,
      (score) => `${score} exactos`
    ),
    makeAward(
      "racha-ganadora",
      "Modo invicto",
      "Mayor racha seguida sumando puntos",
      rachaGanadora,
      (score) => `${score} partidos`
    ),
    makeAward(
      "mata-mata",
      "Rey del mata-mata",
      "Más puntos en eliminación directa",
      mataMata,
      (score) => `${score} pts`
    ),
    makeAward(
      "regularidad",
      "Reloj suizo",
      "Mayor porcentaje de pronósticos puntuados",
      regularidad,
      (score) => `${score}% de aciertos`
    ),
    makeAward(
      "racha-sufrida",
      "La pelota no quiso entrar",
      "Mayor racha seguida sin sumar",
      rachaSufrida,
      (score) => `${score} partidos`
    ),
    makeAward(
      "menos-exactos",
      "El arco estaba allá",
      "Menos marcadores exactos",
      menosExactos,
      (score) => `${score} exactos`
    ),
  ];
}
