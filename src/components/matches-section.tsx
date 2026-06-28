"use client";

import useSWR from "swr";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CheckCircle2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getPhaseLabel, isKnockoutPhase, type Outcome } from "@/lib/points";

interface Match {
  id: number;
  phase: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: Outcome | null;
  status: string;
  finished: boolean;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function MatchCard({ match }: { match: Match }) {
  const kickoff = new Date(match.kickoff);
  const winnerTeam =
    match.winner === "home"
      ? match.homeTeam
      : match.winner === "away"
      ? match.awayTeam
      : null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-4 py-3 gap-3">
      <div className="flex-1 text-right">
        <span className="font-medium text-sm">{match.homeTeam}</span>
      </div>
      <div className="flex min-w-[96px] flex-col items-center">
        <Badge variant="outline" className="mb-1 text-[10px]">
          {getPhaseLabel(match.phase)}
        </Badge>
        {match.finished && match.homeScore !== null ? (
          <span className="font-bold text-lg tabular-nums">
            {match.homeScore} – {match.awayScore}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs font-medium">
            {format(kickoff, "dd/MM HH:mm")}
          </span>
        )}
        <Badge
          variant={match.finished ? "success" : "outline"}
          className="mt-1 text-[10px]"
        >
          {match.finished ? "Finalizado" : match.status}
        </Badge>
        {match.finished && winnerTeam && isKnockoutPhase(match.phase) && (
          <span className="mt-1 max-w-[120px] truncate text-[10px] text-muted-foreground">
            Clasifica: {winnerTeam}
          </span>
        )}
      </div>
      <div className="flex-1 text-left">
        <span className="font-medium text-sm">{match.awayTeam}</span>
      </div>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function UpcomingMatches() {
  const { data, isLoading } = useSWR<Match[]>("/api/matches", fetcher, {
    refreshInterval: 120_000,
  });

  const upcoming = Array.isArray(data) ? data.filter((m) => !m.finished).slice(0, 8) : [];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-blue-400" />
          Próximos Partidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <MatchesSkeleton />
        ) : !upcoming.length ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No hay partidos próximos
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FinishedMatches() {
  const { data, isLoading } = useSWR<Match[]>("/api/matches", fetcher, {
    refreshInterval: 120_000,
  });

  const finished = Array.isArray(data) ? [...data].filter((m) => m.finished).reverse().slice(0, 8) : [];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          Partidos Finalizados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <MatchesSkeleton />
        ) : !finished.length ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No hay partidos finalizados
          </p>
        ) : (
          <div className="space-y-2">
            {finished.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LastUpdated() {
  const { data } = useSWR<Match[]>("/api/matches", fetcher, {
    refreshInterval: 120_000,
  });

  if (!Array.isArray(data) || !data.length) return null;

  const latest = data.reduce((a, b) =>
    new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
  );

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span>
        Actualizado{" "}
        {formatDistanceToNow(new Date(latest.updatedAt), {
          addSuffix: true,
          locale: es,
        })}
      </span>
    </div>
  );
}
