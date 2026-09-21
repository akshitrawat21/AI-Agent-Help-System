import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { publish } from "@/lib/events";

type Params = { params: Promise<{ id: string }> };

/**
 * A teammate takes an escalation. Claiming is what stops two agents drafting
 * answers to the same visitor: the queue shows who has it, and the "Mine"
 * filter gives each person their own worklist.
 *
 * Claiming is not exclusive — anyone can still answer — but a claimed item
 * is visibly someone's. Reclaiming hands it over.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const orgId = auth.session.org.id;

  const result = await db.escalation.updateMany({
    where: { id, orgId, status: "pending" },
    data: { assigneeId: auth.session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "That escalation is no longer waiting" },
      { status: 404 }
    );
  }

  await publish({ type: "escalation.answered", orgId, escalationId: id });
  return NextResponse.json({ ok: true });
}

/** Release a claim, putting the item back in the shared pool. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const orgId = auth.session.org.id;

  await db.escalation.updateMany({
    where: { id, orgId, status: "pending", assigneeId: auth.session.user.id },
    data: { assigneeId: null },
  });

  await publish({ type: "escalation.answered", orgId, escalationId: id });
  return NextResponse.json({ ok: true });
}
