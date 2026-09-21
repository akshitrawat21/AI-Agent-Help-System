import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession, switchSessionOrg } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orgId = typeof body?.orgId === "string" ? body.orgId : null;

  if (!orgId) {
    return NextResponse.json({ error: "Missing workspace" }, { status: 400 });
  }

  // Only switch into an org the user actually belongs to.
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  await switchSessionOrg(session.token, orgId);
  return NextResponse.json({ ok: true });
}
