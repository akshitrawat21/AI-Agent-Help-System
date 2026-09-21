import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";

/**
 * Heartbeat from an open dashboard. The widget uses "seen in the last few
 * minutes" to tell visitors whether a person is actually around, which is the
 * difference between "a teammate will join you" being a promise and a hope.
 */
export async function POST() {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  await db.membership.updateMany({
    where: { userId: auth.session.user.id, orgId: auth.session.org.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
