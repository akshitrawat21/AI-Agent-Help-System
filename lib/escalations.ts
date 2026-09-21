import { db } from "@/lib/db";
import { publish } from "@/lib/events";

/**
 * Marks pending escalations whose SLA has elapsed as missed.
 *
 * Deliberately lazy rather than timer-driven: an in-process setTimeout is lost
 * on every restart and deploy, whereas `dueAt` is durable. Called wherever
 * escalations are read, so the queue is always accurate when someone looks at
 * it, and the dashboard's "missed" count can be trusted.
 */
export async function sweepOverdueEscalations(orgId: string): Promise<number> {
  const overdue = await db.escalation.findMany({
    where: { orgId, status: "pending", dueAt: { lt: new Date() } },
    select: { id: true, conversationId: true },
  });

  if (overdue.length === 0) return 0;

  const ids = overdue.map((escalation) => escalation.id);

  await db.$transaction([
    db.escalation.updateMany({
      // `status: "pending"` again, deliberately: the rows were selected a
      // moment ago and an agent may have answered one in between. Without it
      // the sweep would clobber a delivered answer back to "missed".
      where: { id: { in: ids }, status: "pending" },
      data: { status: "missed" },
    }),
    db.conversation.updateMany({
      where: {
        id: { in: overdue.map((escalation) => escalation.conversationId) },
        status: "waiting",
      },
      data: { status: "missed" },
    }),
  ]);

  for (const escalation of overdue) {
    publish({ type: "escalation.missed", orgId, escalationId: escalation.id });
  }

  return overdue.length;
}
