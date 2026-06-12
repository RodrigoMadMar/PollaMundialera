export interface ScoreResult {
  homeScore: number;
  awayScore: number;
}

export function getWinner(score: ScoreResult): "home" | "away" | "draw" {
  if (score.homeScore > score.awayScore) return "home";
  if (score.awayScore > score.homeScore) return "away";
  return "draw";
}

export function calculatePoints(
  actual: ScoreResult,
  predicted: ScoreResult
): number {
  const correctWinner = getWinner(actual) === getWinner(predicted);
  const exactScore =
    actual.homeScore === predicted.homeScore &&
    actual.awayScore === predicted.awayScore;

  if (exactScore) return 5;
  if (correctWinner) return 3;
  return 0;
}
