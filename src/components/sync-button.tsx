"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mutate } from "swr";

export function SyncButton() {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync-matches");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success(`Sincronizado — ${data.synced ?? 0} partidos actualizados`);
      // Revalidate all SWR keys so matches, leaderboard and live scores refresh immediately
      await mutate(() => true, undefined, { revalidate: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al sincronizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={loading}
      className="gap-1.5"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Sincronizando..." : "Sincronizar"}
    </Button>
  );
}
