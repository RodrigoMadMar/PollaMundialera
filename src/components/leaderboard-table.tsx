"use client";

import useSWR from "swr";
import {
  CircleOff,
  Crosshair,
  Flame,
  Gauge,
  Medal,
  Sparkles,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PHASES,
  getPhaseLabel,
  type MatchPhase,
} from "@/lib/points";
import {
  calculateWorldCupAwards,
  type AwardId,
  type AwardLeaderboardEntry,
} from "@/lib/awards";

interface LeaderboardEntry extends AwardLeaderboardEntry {
  rank: number;
  points: number;
  phasePoints?: Partial<Record<MatchPhase, number>>;
}

const AWARD_ICONS: Record<
  AwardId,
  { icon: LucideIcon; className: string }
> = {
  exactos: { icon: Crosshair, className: "text-emerald-400" },
  "racha-ganadora": { icon: Flame, className: "text-orange-400" },
  "mata-mata": { icon: Swords, className: "text-red-400" },
  regularidad: { icon: Gauge, className: "text-sky-400" },
  "racha-sufrida": { icon: CircleOff, className: "text-slate-400" },
  "menos-exactos": { icon: Crosshair, className: "text-rose-300" },
};

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
  const awards = data ? calculateWorldCupAwards(data) : [];

  return (
    <div className="space-y-6">
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

      {awards.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-fuchsia-400" />
              Premios del Mundial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {awards.map((award) => {
                const { icon: Icon, className } = AWARD_ICONS[award.id];

                return (
                  <div
                    key={award.id}
                    className="flex min-w-0 gap-3 border-b border-border/60 py-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/60">
                      <Icon className={`h-5 w-5 ${className}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h3 className="text-sm font-semibold">{award.title}</h3>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {award.value}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-sm font-medium text-primary">
                        {award.winners.join(", ")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {award.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
