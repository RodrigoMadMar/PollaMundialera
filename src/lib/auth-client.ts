export function isMatchLocked(kickoff: Date | string): boolean {
  const kickoffDate = new Date(kickoff);
  const cutoff = new Date(kickoffDate.getTime() - 15 * 60 * 1000);
  return new Date() >= cutoff;
}
