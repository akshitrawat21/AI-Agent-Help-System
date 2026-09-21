import { Inbox } from "@/components/app/inbox";
import { PageHeader } from "@/components/app/page-header";
import { requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { sweepOverdueEscalations } from "@/lib/escalations";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const session = await requireSession();
  const orgId = session.org.id;

  await sweepOverdueEscalations(orgId);

  const conversations = await db.conversation.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { role: true, content: true, confidence: true, createdAt: true },
      },
      escalations: { where: { status: "pending" }, select: { id: true } },
    },
  });

  const initial = conversations.map((conversation) => ({
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Inbox"
        description="Every conversation, with the assistant's confidence on each answer. Jump in whenever you want to take over."
      />
      <Inbox initial={initial} />
    </div>
  );
}
