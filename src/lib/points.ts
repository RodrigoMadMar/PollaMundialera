export interface ScoreResult {
  homeScore: number;
  awayScore: number;
}

export type MatchPhase =
  | "group"
  | "roundOf32"
  | "roundOf16"
  | "quarterfinal"
  | "semifinal"
  | "thirdPlace"
  | "final";

export const PHASE_POINTS: Record<MatchPhase, { exact: number; winner: number }> = {
  group: { exact: 5, winner: 3 },
  roundOf32: { exact: 10, winner: 6 },
  roundOf16: { exact: 14, winner: 8 },
  quarterfinal: { exact: 20, winner: 12 },
  semifinal: { exact: 28, winner: 16 },
  thirdPlace: { exact: 30, winner: 18 },
  final: { exact: 40, winner: 25 },
};

export function getMatchPhase(matchNumber: number): MatchPhase {
  if (matchNumber <= 72) return "group";
  if (matchNumber <= 88) return "roundOf32";
  if (matchNumber <= 96) return "roundOf16";
  if (matchNumber <= 100) return "quarterfinal";
  if (matchNumber <= 102) return "semifinal";
  if (matchNumber === 103) return "thirdPlace";
  return "final";
}

export function getWinner(score: ScoreResult): "home" | "away" | "draw" {
  if (score.homeScore > score.awayScore) return "home";
  if (score.awayScore > score.homeScore) return "away";
  return "draw";
}

export function calculatePoints(
  actual: ScoreResult,
  predicted: ScoreResult,
  phase: MatchPhase = "group"
): number {
  const correctWinner = getWinner(actual) === getWinner(predicted);
  const exactScore =
    actual.homeScore === predicted.homeScore &&
    actual.awayScore === predicted.awayScore;
  const phasePoints = PHASE_POINTS[phase];

  if (exactScore) return phasePoints.exact;
  if (correctWinner) return phasePoints.winner;
  return 0;
}
