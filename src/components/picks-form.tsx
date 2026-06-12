"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Lock, Save, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { isMatchLocked } from "@/lib/auth-client";

interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  finished: boolean;
}

interface Prediction {
  matchId: number;
  predictedHome: number | null;
  predictedAway: number | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function MatchPickRow({
  match,
  prediction,
  onSave,
}: {
  match: Match;
  prediction?: Prediction;
  onSave: (matchId: number, home: number, away: number) => Promise<void>;
}) {
  const [home, setHome] = useState(prediction?.predictedHome?.toString() ?? "");
  const [away, setAway] = useState(prediction?.predictedAway?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prediction) {
      setHome(prediction.predictedHome?.toString() ?? "");
      setAway(prediction.predictedAway?.toString() ?? "");
    }
  }, [prediction]);

  const locked = isMatchLocked(match.kickoff);
  const kickoff = new Date(match.kickoff);

  const handleSave = async () => {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      toast.error("Ingresa valores válidos (números >= 0)");
      return;
    }
    setSaving(true);
    try {
      await onSave(match.id, h, a);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        locked
          ? "border-border/30 bg-muted/20 opacity-75"
          : "border-border/50 bg-background/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(kickoff, "dd MMM · HH:mm", { locale: es })}
          </span>
          {locked && (
            <Badge variant="warning" className="text-[10px] gap-1">
              <Lock className="h-2.5 w-2.5" />
              Pronóstico cerrado
            </Badge>
          )}
          {match.finished && (
            <Badge variant="success" className="text-[10px]">
              {match.homeScore} – {match.awayScore}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-right font-medium text-sm">{match.homeTeam}</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={99}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            disabled={locked}
            className="w-14 text-center tabular-nums"
          />
          <span className="text-muted-foreground font-bold">–</span>
          <Input
            type="number"
            min={0}
            max={99}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            disabled={locked}
            className="w-14 text-center tabular-nums"
          />
        </div>
        <span className="flex-1 font-medium text-sm">{match.awayTeam}</span>
        {!locked && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="min-w-[80px]"
          >
            {saved ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                Guardado
              </>
            ) : saving ? (
              "Guardando..."
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Guardar
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PicksForm() {
  const { data: matches, isLoading: loadingMatches } = useSWR<Match[]>(
    "/api/matches",
    fetcher
  );
  const {
    data: userPredictions,
    isLoading: loadingPredictions,
    mutate: mutatePredictions,
  } = useSWR<Prediction[]>("/api/predictions", fetcher);

  const isLoading = loadingMatches || loadingPredictions;

  const predMap = new Map(userPredictions?.map((p) => [p.matchId, p]) ?? []);

  const handleSave = async (matchId: number, home: number, away: number) => {
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, predictedHome: home, predictedAway: away }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Error al guardar");
      throw new Error(data.error);
    }

    toast.success("Pronóstico guardado");
    await mutatePredictions();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!matches?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No hay partidos disponibles aún
        </CardContent>
      </Card>
    );
  }

  const upcoming = matches.filter((m) => !m.finished);
  const finished = matches.filter((m) => m.finished);

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Próximos partidos
          </h2>
          <div className="space-y-2">
            {upcoming.map((m) => (
              <MatchPickRow
                key={m.id}
                match={m}
                prediction={predMap.get(m.id)}
                onSave={handleSave}
              />
            ))}
          </div>
        </section>
      )}
      {finished.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Partidos finalizados
          </h2>
          <div className="space-y-2">
            {finished.reverse().map((m) => (
              <MatchPickRow
                key={m.id}
                match={m}
                prediction={predMap.get(m.id)}
                onSave={handleSave}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
