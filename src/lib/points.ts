export interface ScoreResult {
  homeScore: number;
  awayScore: number;
  winner?: Outcome | string | null;
}

export type Outcome = "home" | "away" | "draw";

export const PHASES = [
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
] as const;

export type MatchPhase = (typeof PHASES)[number];

export interface PhaseConfig {
  label: string;
  exactPoints: number;
  outcomePoints: number;
  knockout: boolean;
}

export const PHASE_CONFIG: Record<MatchPhase, PhaseConfig> = {
  GROUP_STAGE: {
    label: "Fase de grupos",
    exactPoints: 5,
    outcomePoints: 3,
    knockout: false,
  },
  ROUND_OF_32: {
    label: "Ronda de 32",
    exactPoints: 10,
    outcomePoints: 6,
    knockout: true,
  },
  ROUND_OF_16: {
    label: "Octavos de final",
    exactPoints: 14,
    outcomePoints: 8,
    knockout: true,
  },
  QUARTER_FINALS: {
    label: "Cuartos de final",
    exactPoints: 20,
    outcomePoints: 12,
    knockout: true,
  },
  SEMI_FINALS: {
    label: "Semifinales",
    exactPoints: 28,
    outcomePoints: 16,
    knockout: true,
  },
  THIRD_PLACE: {
    label: "Tercer lugar",
    exactPoints: 30,
    outcomePoints: 18,
    knockout: true,
  },
  FINAL: {
    label: "Final",
    exactPoints: 40,
    outcomePoints: 25,
    knockout: true,
  },
};

const PHASE_ALIASES: Record<string, MatchPhase> = {
  GROUP: "GROUP_STAGE",
  GROUPS: "GROUP_STAGE",
  GROUP_STAGE: "GROUP_STAGE",
  FASE_DE_GRUPOS: "GROUP_STAGE",
  LAST_32: "ROUND_OF_32",
  ROUND_OF_32: "ROUND_OF_32",
  RONDA_DE_32: "ROUND_OF_32",
  LAST_16: "ROUND_OF_16",
  ROUND_OF_16: "ROUND_OF_16",
  OCTAVOS: "ROUND_OF_16",
  QUARTER_FINALS: "QUARTER_FINALS",
  QUARTERFINALS: "QUARTER_FINALS",
  CUARTOS: "QUARTER_FINALS",
  SEMI_FINALS: "SEMI_FINALS",
  SEMIFINALS: "SEMI_FINALS",
  SEMIFINALES: "SEMI_FINALS",
  THIRD_PLACE: "THIRD_PLACE",
  TERCER_LUGAR: "THIRD_PLACE",
  FINAL: "FINAL",
};

export interface PointsBreakdown {
  phase: MatchPhase;
  exactScore: boolean;
  correctOutcome: boolean;
  exactScorePoints: number;
  outcomePoints: number;
  total: number;
}

function normalizeKey(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function normalizePhase(phase?: string | null): MatchPhase {
  if (!phase) return "GROUP_STAGE";
  return PHASE_ALIASES[normalizeKey(phase)] ?? "GROUP_STAGE";
}

export function getPhaseLabel(phase?: string | null): string {
  return PHASE_CONFIG[normalizePhase(phase)].label;
}

export function isKnockoutPhase(phase?: string | null): boolean {
  return PHASE_CONFIG[normalizePhase(phase)].knockout;
}

export function normalizeOutcome(outcome?: string | null): Outcome | null {
  if (!outcome) return null;

  const key = normalizeKey(outcome);
  if (["HOME", "HOME_TEAM", "LOCAL"].includes(key)) return "home";
  if (["AWAY", "AWAY_TEAM", "VISITOR", "VISITANTE"].includes(key)) return "away";
  if (["DRAW", "TIE", "EMPATE"].includes(key)) return "draw";
  return null;
}

export function getWinner(score: ScoreResult): Outcome {
  if (score.homeScore > score.awayScore) return "home";
  if (score.awayScore > score.homeScore) return "away";
  return "draw";
}

function getOutcome(score: ScoreResult): Outcome {
  return normalizeOutcome(score.winner) ?? getWinner(score);
}

export function calculatePredictionScore({
  actual,
  predicted,
  phase,
}: {
  actual: ScoreResult;
  predicted: ScoreResult;
  phase?: string | null;
}): PointsBreakdown {
  const normalizedPhase = normalizePhase(phase);
  const config = PHASE_CONFIG[normalizedPhase];
  const exactScore =
    actual.homeScore === predicted.homeScore &&
    actual.awayScore === predicted.awayScore;
  const correctOutcome = getOutcome(actual) === getOutcome(predicted);
  const exactScorePoints = exactScore ? config.exactPoints : 0;
  const outcomePoints = correctOutcome ? config.outcomePoints : 0;

  return {
    phase: normalizedPhase,
    exactScore,
    correctOutcome,
    exactScorePoints,
    outcomePoints,
    total: exactScorePoints + outcomePoints,
  };
}

export function calculatePoints(
  actual: ScoreResult,
  predicted: ScoreResult,
  phase?: string | null
): number {
  return calculatePredictionScore({ actual, predicted, phase }).total;
}
