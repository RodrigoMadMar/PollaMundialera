"use client";

import useSWR from "swr";
import { Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PHASES, getPhaseLabel, type MatchPhase } from "@/lib/points";

interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  points: number;
  phasePoints?: Partial<Record<MatchPhase, number>>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="w-5 text-center text-muted-foreground text-sm">{rank}</span>;
}

function PhaseBreakdown({ entry }: { entry: LeaderboardEntry }) {
  const breakdown = PHASES.map((phase) => ({
    phase,
    points: entry.phasePoints?.[phase] ?? 0,
  })).filter(({ points }) => points > 0);

  if (!breakdown.length) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {breakdown.map(({ phase, points }) => (
        <span key={phase} className="tabular-nums">
          {getPhaseLabel(phase)}: {points}
        </span>
      ))}
    </div>
  );
}

export function LeaderboardTable() {
  const { data, isLoading } = useSWR<LeaderboardEntry[]>(
    "/api/leaderboard",
    fetcher,
    { refreshInterval: 120_000 }
  );

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Tabla de Posiciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No hay datos disponibles
          </p>
        ) : (
          <div className="space-y-1">
            {data.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  i === 0
                    ? "bg-yellow-500/10 border border-yellow-500/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex w-6 items-center justify-center pt-0.5">
                  <RankIcon rank={entry.rank} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{entry.name}</span>
                  <PhaseBreakdown entry={entry} />
                </div>
                <span
                  className={`font-bold tabular-nums ${
                    i === 0 ? "text-yellow-400" : "text-foreground"
                  }`}
                >
                  {entry.points} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
