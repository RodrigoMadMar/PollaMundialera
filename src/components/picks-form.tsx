"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Lock, Save, CheckCircle, CircleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { isMatchLocked } from "@/lib/auth-client";
import {
  PHASES,
  getPhaseLabel,
  getWinner,
  isKnockoutPhase,
  normalizePhase,
  type Outcome,
} from "@/lib/points";

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
}

interface Prediction {
  matchId: number;
  predictedHome: number | null;
  predictedAway: number | null;
  predictedWinner: Outcome | null;
}

type Qualifier = "home" | "away";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? "Error al cargar datos");
  }

  return data;
};

function getScoreWinner(home: string, away: string): Outcome | null {
  if (home === "" || away === "") return null;
  const homeScore = Number(home);
  const awayScore = Number(away);
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) return null;
  return getWinner({ homeScore, awayScore });
}

function getPredictionScoreWinner(prediction?: Prediction): Outcome | null {
  if (prediction?.predictedHome == null || prediction.predictedAway == null) return null;
  return getWinner({
    homeScore: prediction.predictedHome,
    awayScore: prediction.predictedAway,
  });
}

function getQualifierLabel(match: Match, qualifier?: Outcome | null): string | null {
  if (qualifier === "home") return match.homeTeam;
  if (qualifier === "away") return match.awayTeam;
  return null;
}

function isPredictionComplete(match: Match, prediction?: Prediction): boolean {
  if (prediction?.predictedHome == null || prediction.predictedAway == null) return false;

  const phase = normalizePhase(match.phase);
  if (!isKnockoutPhase(phase)) return true;

  const scoreWinner = getPredictionScoreWinner(prediction);
  if (scoreWinner === "draw") {
    return prediction.predictedWinner === "home" || prediction.predictedWinner === "away";
  }

  return true;
}

function getKickoffTime(match: Match): number {
  return new Date(match.kickoff).getTime();
}

function sortMatchesForPhase(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? 1 : -1;

    const diff = getKickoffTime(a) - getKickoffTime(b);
    return a.finished ? -diff : diff;
  });
}

function getNextMatchTime(matches: Match[]): number {
  const upcomingTimes = matches
    .filter((match) => !match.finished)
    .map(getKickoffTime);

  return upcomingTimes.length ? Math.min(...upcomingTimes) : Number.POSITIVE_INFINITY;
}

function getLastMatchTime(matches: Match[]): number {
  const times = matches.map(getKickoffTime);
  return times.length ? Math.max(...times) : Number.NEGATIVE_INFINITY;
}

function getPhasePriority(matches: Match[]): number {
  if (matches.some((match) => !match.finished)) return 0;
  if (matches.length === 0) return 1;
  return 2;
}

function MatchPickRow({
  match,
  prediction,
  onSave,
}: {
  match: Match;
  prediction?: Prediction;
  onSave: (
    matchId: number,
    home: number,
    away: number,
    predictedWinner?: Qualifier
  ) => Promise<void>;
}) {
  const [home, setHome] = useState(prediction?.predictedHome?.toString() ?? "");
  const [away, setAway] = useState(prediction?.predictedAway?.toString() ?? "");
  const [winner, setWinner] = useState<Qualifier | "">(
    prediction?.predictedWinner === "home" || prediction?.predictedWinner === "away"
      ? prediction.predictedWinner
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prediction) {
      setHome(prediction.predictedHome?.toString() ?? "");
      setAway(prediction.predictedAway?.toString() ?? "");
      setWinner(
        prediction.predictedWinner === "home" || prediction.predictedWinner === "away"
          ? prediction.predictedWinner
          : ""
      );
    }
  }, [prediction]);

  const phase = normalizePhase(match.phase);
  const knockout = isKnockoutPhase(phase);
  const locked = isMatchLocked(match.kickoff);
  const kickoff = new Date(match.kickoff);
  const scoreWinner = getScoreWinner(home, away);
  const needsQualifier = knockout && scoreWinner === "draw";
  const effectiveWinner =
    knockout && scoreWinner && scoreWinner !== "draw" ? scoreWinner : winner;
  const selectedQualifierLabel = getQualifierLabel(match, effectiveWinner || null);
  const savedScoreWinner = getPredictionScoreWinner(prediction);
  const savedQualifier =
    knockout && savedScoreWinner && savedScoreWinner !== "draw"
      ? savedScoreWinner
      : prediction?.predictedWinner;
  const savedQualifierLabel = getQualifierLabel(match, savedQualifier ?? null);
  const hasSavedPrediction = isPredictionComplete(match, prediction);
  const qualifierMissing = needsQualifier && winner !== "home" && winner !== "away";

  const handleSave = async () => {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      toast.error("Ingresa valores válidos (números >= 0)");
      return;
    }

    let predictedWinner: Qualifier | undefined;
    if (knockout) {
      const outcome = getWinner({ homeScore: h, awayScore: a });
      if (outcome === "draw") {
        if (winner !== "home" && winner !== "away") {
          toast.error("Elige el equipo clasificado para esta llave");
          return;
        }
        predictedWinner = winner;
      } else {
        predictedWinner = outcome;
      }
    }

    setSaving(true);
    try {
      await onSave(match.id, h, a, predictedWinner);
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(kickoff, "dd MMM · HH:mm", { locale: es })}
          </span>
          {locked && (
            <Badge variant="warning" className="text-[10px] gap-1">
              <Lock className="h-2.5 w-2.5" />
              Pronóstico cerrado
            </Badge>
          )}
          {hasSavedPrediction && (
            <Badge variant="success" className="text-[10px] gap-1">
              <CheckCircle className="h-2.5 w-2.5" />
              Guardado
            </Badge>
          )}
          {match.finished && (
            <Badge variant="success" className="text-[10px]">
              {match.homeScore} – {match.awayScore}
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <span className="min-w-0 truncate text-right text-sm font-medium">
          {match.homeTeam}
        </span>
        <div className="flex items-center justify-center gap-2">
          <Input
            type="number"
            min={0}
            max={99}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            disabled={locked}
            className="w-12 text-center tabular-nums sm:w-14"
            aria-label={`Goles de ${match.homeTeam}`}
          />
          <span className="font-bold text-muted-foreground">-</span>
          <Input
            type="number"
            min={0}
            max={99}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            disabled={locked}
            className="w-12 text-center tabular-nums sm:w-14"
            aria-label={`Goles de ${match.awayTeam}`}
          />
        </div>
        <span className="min-w-0 truncate text-left text-sm font-medium">
          {match.awayTeam}
        </span>
      </div>
      {!locked && (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="w-full min-w-[80px] sm:w-auto"
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
        </div>
      )}
      {knockout && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-end">
          <span className="text-xs font-medium text-muted-foreground">Clasifica</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={effectiveWinner === "home" ? "default" : "outline"}
              size="sm"
              disabled={locked || !needsQualifier}
              onClick={() => setWinner("home")}
              className="h-8 max-w-[180px] truncate"
            >
              {match.homeTeam}
            </Button>
            <Button
              type="button"
              variant={effectiveWinner === "away" ? "default" : "outline"}
              size="sm"
              disabled={locked || !needsQualifier}
              onClick={() => setWinner("away")}
              className="h-8 max-w-[180px] truncate"
            >
              {match.awayTeam}
            </Button>
          </div>
        </div>
      )}
      {qualifierMissing && !locked && (
        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-destructive">
          <CircleAlert className="h-3.5 w-3.5" />
          Falta elegir clasificado
        </div>
      )}
      <div className="mt-3 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        {hasSavedPrediction && prediction ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Guardado: {match.homeTeam} {prediction.predictedHome} – {prediction.predictedAway} {match.awayTeam}
            </span>
            {knockout && savedQualifierLabel && (
              <span className="font-medium text-foreground">Clasifica: {savedQualifierLabel}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>Sin pronóstico guardado</span>
            {knockout && selectedQualifierLabel && (
              <span className="font-medium text-foreground">Clasifica: {selectedQualifierLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PicksForm() {
  const {
    data: matches,
    error: matchesError,
    isLoading: loadingMatches,
  } = useSWR<Match[]>("/api/matches", fetcher);
  const {
    data: userPredictions,
    error: predictionsError,
    isLoading: loadingPredictions,
    mutate: mutatePredictions,
  } = useSWR<Prediction[]>("/api/predictions", fetcher);

  const isLoading = loadingMatches || loadingPredictions;
  const loadError = matchesError || predictionsError;
  const matchList = Array.isArray(matches) ? matches : [];

  const predMap = new Map(userPredictions?.map((p) => [p.matchId, p]) ?? []);

  const handleSave = async (
    matchId: number,
    home: number,
    away: number,
    predictedWinner?: Qualifier
  ) => {
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, predictedHome: home, predictedAway: away, predictedWinner }),
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

  if (loadError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {loadError.message ?? "No se pudieron cargar los pronósticos"}
        </CardContent>
      </Card>
    );
  }

  const phaseGroups = PHASES.map((phase, phaseIndex) => {
    const phaseMatches = sortMatchesForPhase(
      matchList.filter((match) => normalizePhase(match.phase) === phase)
    );
    const completedPredictions = phaseMatches.filter((match) =>
      isPredictionComplete(match, predMap.get(match.id))
    ).length;

    return {
      phase,
      phaseIndex,
      matches: phaseMatches,
      completedPredictions,
      priority: getPhasePriority(phaseMatches),
      nextMatchTime: getNextMatchTime(phaseMatches),
      lastMatchTime: getLastMatchTime(phaseMatches),
    };
  }).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.priority === 0) return a.nextMatchTime - b.nextMatchTime;
    if (a.priority === 2) return b.lastMatchTime - a.lastMatchTime;
    return a.phaseIndex - b.phaseIndex;
  });

  return (
    <div className="space-y-6">
      {phaseGroups.map(({ phase, matches, completedPredictions }) => (
        <section key={phase}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {getPhaseLabel(phase)}
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {completedPredictions}/{matches.length} completados
            </Badge>
          </div>
          {matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map((m) => (
                <MatchPickRow
                  key={m.id}
                  match={m}
                  prediction={predMap.get(m.id)}
                  onSave={handleSave}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/50 bg-background/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay partidos cargados para esta fase
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
