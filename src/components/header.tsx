"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe2, LogOut, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Header() {
  const router = useRouter();
  const { data: predictions } = useSWR("/api/predictions", fetcher, {
    shouldRetryOnError: false,
  });

  const isLoggedIn = Array.isArray(predictions);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    toast.success("Sesión cerrada");
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
          <Globe2 className="h-6 w-6 text-primary" />
          <span className="hidden sm:block">Polla Mundialera</span>
          <span className="sm:hidden">PM</span>
        </Link>
        <nav className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/picks">
                  <BarChart3 className="h-4 w-4" />
                  Mis Pronósticos
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Salir</span>
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">Ingresar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
