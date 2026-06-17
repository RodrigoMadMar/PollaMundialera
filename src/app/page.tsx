import { Globe2 } from "lucide-react";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { UpcomingMatches, LastUpdated } from "@/components/matches-section";
import { SyncButton } from "@/components/sync-button";
import { LiveMatches } from "@/components/live-matches";
import { FinishedWithScores } from "@/components/finished-with-scores";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 pt-2">
        <div className="flex items-center justify-center gap-3">
          <Globe2 className="h-10 w-10 text-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Polla Mundialera
          </h1>
        </div>
        <p className="text-muted-foreground">
          Pronósticos del Mundial de Fútbol
        </p>
        <div className="flex items-center justify-center gap-3">
          <LastUpdated />
          <SyncButton />
        </div>
      </div>

      <LeaderboardTable />

      <LiveMatches />

      <div className="grid gap-6 md:grid-cols-2">
        <UpcomingMatches />
        <FinishedWithScores />
      </div>
    </div>
  );
}
