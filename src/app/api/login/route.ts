import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT id, name, email FROM users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Email no autorizado" }, { status: 401 });
    }

    const user = rows[0] as { id: number; name: string; email: string };
    await setSessionCookie(user.email);

    return NextResponse.json({ ok: true, name: user.name });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
