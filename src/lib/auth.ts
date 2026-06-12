import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "pm_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getSessionUser() {
  const cookieStore = await cookies();
  const email = cookieStore.get(COOKIE_NAME)?.value;
  if (!email) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function setSessionCookie(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function isMatchLocked(kickoff: Date | string): boolean {
  const kickoffDate = new Date(kickoff);
  const cutoff = new Date(kickoffDate.getTime() - 15 * 60 * 1000);
  return new Date() >= cutoff;
}
