import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/matches/537352",
      {
        headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
        next: { revalidate: 0 },
      }
    );
    const data = await res.json();
    return NextResponse.json({
      status: data.status,
      minute: data.minute,
      score: data.score,
      homeTeam: data.homeTeam?.name,
      awayTeam: data.awayTeam?.name,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
