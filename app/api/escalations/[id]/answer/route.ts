import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { publish } from "@/lib/events";
import { getAgentConfig } from "@/lib/agent-config";
import { answerEscalationSchema, fieldErrors } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

/**
 * A teammate answers an escalation. The answer is delivered to the visitor as
 * a message in their conversation and — when auto-learn is on — saved to the
 * knowledge base, so the assistant handles the same question itself next time.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = answerEscalationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const orgId = auth.session.org.id;
  const { answer, saveToKnowledge, category } = parsed.data;

  const escalation = await db.escalation.findFirst({
    where: { id, orgId },
  });
  if (!escalation) {
    return NextResponse.json(
      { error: "Escalation not found" },
      { status: 404 }
    );
  }

  const config = await getAgentConfig(orgId);
  const now = new Date();

  // Claim the escalation with the status in the where-clause, so two agents
  // hitting "Send" at once can't both deliver an answer and both teach the
  // knowledge base. Whoever loses the race gets the 409.
  const claim = await db.escalation.updateMany({
    where: { id, orgId, status: { not: "answered" } },
    data: {
      status: "answered",
      answer,
      assigneeId: auth.session.user.id,
      answeredAt: now,
    },
  });

  if (claim.count === 0) {
    return NextResponse.json(
      { error: "This escalation was already answered" },
      { status: 409 }
    );
  }

  await db.$transaction([
    db.message.create({
      data: {
        conversationId: escalation.conversationId,
        role: "human",
        content: answer,
        authorId: auth.session.user.id,
      },
    }),
    // Any sibling escalation on the same conversation is settled by this
    // reply too; leaving them pending would later mark the conversation as
    // having missed its SLA even though a person answered.
    db.escalation.updateMany({
      where: {
        conversationId: escalation.conversationId,
        orgId,
        status: "pending",
      },
      data: {
        status: "answered",
        answer,
        assigneeId: auth.session.user.id,
        answeredAt: now,
      },
    }),
    // "live", not "resolved": the teammate has joined the conversation and
    // the visitor can keep talking to them. Whoever is handling it closes it
    // from the inbox when they're done.
    db.conversation.update({
      where: { id: escalation.conversationId },
      data: { status: "live" },
    }),
  ]);

  // The learning loop: teach the assistant what the human just answered.
  if (saveToKnowledge && config.autoLearn) {
    await db.knowledgeArticle.create({
      data: {
        orgId,
        question: escalation.question,
        answer,
        category: category || "General",
        source: "learned",
      },
    });
  }

  publish({ type: "escalation.answered", orgId, escalationId: id });
  publish({
    type: "message.created",
    orgId,
    conversationId: escalation.conversationId,
  });

  return NextResponse.json({ ok: true, learned: saveToKnowledge && config.autoLearn });
}
