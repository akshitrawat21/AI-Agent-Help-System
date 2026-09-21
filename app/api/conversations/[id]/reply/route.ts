import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { publish } from "@/lib/events";
import { fieldErrors, replySchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

/** A teammate replying directly in the inbox, taking over from the assistant. */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = replySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const orgId = auth.session.org.id;

  const conversation = await db.conversation.findFirst({
    where: { id, orgId },
    select: { id: true },
  });
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const message = await db.message.create({
    data: {
      conversationId: id,
      role: "human",
      content: parsed.data.content,
      authorId: auth.session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  // A human reply closes out any escalation that was waiting on one.
  const settled = await db.escalation.findMany({
    where: { conversationId: id, orgId, status: "pending" },
    select: { id: true },
  });

  if (settled.length > 0) {
    await db.escalation.updateMany({
      where: { id: { in: settled.map((escalation) => escalation.id) } },
      data: {
        status: "answered",
        answer: parsed.data.content,
        assigneeId: auth.session.user.id,
        answeredAt: new Date(),
      },
    });
  }

  // A teammate replying keeps the conversation open and live, so the visitor
  // can respond. Closing it is a deliberate act, not a side effect of typing.
  await db.conversation.update({
    where: { id },
    data: { status: "live" },
  });

  publish({ type: "message.created", orgId, conversationId: id });

  // Tell any open escalation queue that these are settled, so it doesn't keep
  // offering an item that now 409s on answer.
  for (const escalation of settled) {
    publish({ type: "escalation.answered", orgId, escalationId: escalation.id });
  }

  return NextResponse.json({ message });
}
