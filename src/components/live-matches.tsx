"use client";

import useSWR from "swr";
import { Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlayerPrediction {
  name: string;
  predictedHome: number;
  predictedAway: number;
  points: number | null;
}

interface LiveMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  players: PlayerPrediction[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function pointsBadgeClass(pts: number | null) {
  if (pts === null) return "bg-muted text-muted-foreground";
  if (pts >= 8) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (pts > 0) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

function LiveMatchCard({ match }: { match: LiveMatch }) {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 overflow-hidden">
      {/* Score row */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex-1 text-right">
          <span className="font-semibold text-sm">{match.homeTeam}</span>
        </div>
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="font-bold text-xl tabular-nums text-yellow-400">
            {match.homeScore ?? "-"} - {match.awayScore ?? "-"}
          </span>
          <Badge className="mt-1 text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/40 animate-pulse">
            En juego
          </Badge>
        </div>
        <div className="flex-1 text-left">
          <span className="font-semibold text-sm">{match.awayTeam}</span>
        </div>
      </div>

      {/* Predictions table */}
      {match.players.length > 0 && (
        <div className="border-t border-yellow-500/20 px-4 py-2 space-y-1.5">
          {match.players.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground w-20 truncate">{p.name}</span>
              <span className="tabular-nums font-medium text-foreground/80">
                {p.predictedHome} - {p.predictedAway}
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${pointsBadgeClass(p.points)}`}
              >
                {p.points !== null ? `+${p.points}` : "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveMatches() {
  const { data } = useSWR<LiveMatch[]>("/api/live-predictions", fetcher, {
    refreshInterval: 30_000,
  });

  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <Card className="border-yellow-500/40 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-yellow-400 animate-pulse" />
          En Vivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((m) => (
            <LiveMatchCard key={m.id} match={m} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
