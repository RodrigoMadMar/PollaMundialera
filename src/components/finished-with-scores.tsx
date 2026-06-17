"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerResult {
  name: string;
  predictedHome: number;
  predictedAway: number;
  points: number;
}

interface FinishedMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  players: PlayerResult[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function pointsBadgeClass(pts: number) {
  if (pts === 5) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (pts === 3) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

function FinishedMatchCard({ match }: { match: FinishedMatch }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/50 bg-background/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 text-right">
          <span className="font-medium text-sm">{match.homeTeam}</span>
        </div>
        <div className="flex flex-col items-center min-w-[80px]">
          <span className="font-bold text-lg tabular-nums">
            {match.homeScore} – {match.awayScore}
          </span>
        </div>
        <div className="flex-1 text-left">
          <span className="font-medium text-sm">{match.awayTeam}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && match.players.length > 0 && (
        <div className="border-t border-border/50 px-4 py-2 space-y-1.5">
          {match.players.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground w-20 truncate">{p.name}</span>
              <span className="tabular-nums font-medium text-foreground/80">
                {p.predictedHome} – {p.predictedAway}
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${pointsBadgeClass(p.points)}`}
              >
                +{p.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FinishedWithScores() {
  const { data, isLoading } = useSWR<FinishedMatch[]>(
    "/api/finished-predictions",
    fetcher,
    { refreshInterval: 120_000 }
  );

  const matches = Array.isArray(data) ? data : [];

  if (isLoading) return null;
  if (!matches.length) return null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          Resultados por Partido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {matches.map((m) => (
            <FinishedMatchCard key={m.id} match={m} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
