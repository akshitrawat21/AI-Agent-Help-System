import {
  EscalationQueue,
  type QueueEscalation,
} from "@/components/app/escalation-queue";
import { PageHeader } from "@/components/app/page-header";
import { requireSession } from "@/lib/auth/guard";
import { getAgentConfig } from "@/lib/agent-config";
import { db } from "@/lib/db";
import { sweepOverdueEscalations } from "@/lib/escalations";

export const metadata = { title: "Escalations" };

export default async function EscalationsPage() {
  const session = await requireSession();
  const orgId = session.org.id;

  await sweepOverdueEscalations(orgId);

  const [escalations, config] = await Promise.all([
    db.escalation.findMany({
      where: { orgId, status: "pending" },
      orderBy: { dueAt: "asc" },
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true } },
        conversation: {
          select: {
            id: true,
            channel: true,
            visitorName: true,
            visitorEmail: true,
            messages: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                role: true,
                content: true,
                confidence: true,
                createdAt: true,
              },
            },
          },
        },
      },
    }),
    getAgentConfig(orgId),
  ]);

  // Dates have to be serialized to cross into the client component.
  const initial: QueueEscalation[] = escalations.map((escalation) => ({
    ...escalation,
    createdAt: escalation.createdAt.toISOString(),
    dueAt: escalation.dueAt.toISOString(),
    answeredAt: escalation.answeredAt?.toISOString() ?? null,
    conversation: {
      ...escalation.conversation,
      messages: escalation.conversation.messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  }));

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Escalations"
        description={`Questions ${config.agentName} wasn't confident enough to answer. Your reply goes straight to the visitor — and teaches the assistant.`}
      />
      <EscalationQueue
        initial={initial}
        autoLearn={config.autoLearn}
        currentUserId={session.user.id}
      />
    </div>
  );
}
