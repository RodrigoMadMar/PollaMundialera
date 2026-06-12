import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PicksForm } from "@/components/picks-form";
import { BarChart3 } from "lucide-react";

export default async function PicksPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Mis Pronósticos
        </h1>
        <p className="text-muted-foreground text-sm">
          Hola, <span className="font-medium text-foreground">{user.name}</span> — ingresa
          tus pronósticos antes del inicio de cada partido.
        </p>
      </div>
      <PicksForm />
    </div>
  );
}
