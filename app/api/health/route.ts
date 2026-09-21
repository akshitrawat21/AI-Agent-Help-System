import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Liveness for the host's health check and for an uptime pinger that keeps a
 * free-tier instance awake. Touches the database so the check also wakes a
 * suspended serverless Postgres before a real visitor does.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
