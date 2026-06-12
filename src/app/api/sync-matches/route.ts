import { NextRequest, NextResponse } from "next/server";
import { syncMatches } from "@/lib/football-data";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncMatches();
    revalidatePath("/");
    revalidatePath("/api/matches");
    revalidatePath("/api/leaderboard");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
