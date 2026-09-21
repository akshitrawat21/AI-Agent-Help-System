import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { answerQuestion, escalationMessage } from "@/lib/ai";
import { getAgentConfig, toAgentSettings } from "@/lib/agent-config";
import { publish } from "@/lib/events";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { chatSchema, fieldErrors } from "@/lib/validation";

type Params = { params: Promise<{ slug: string }> };

/**
 * Public: a visitor sends a message to an organization's assistant.
 *
 * This is the whole product loop in one handler — retrieve, answer, and either
 * reply or hand off to a human with an escalation the team can see and answer.
 */
/**
 * A hosted model can take a while to reply; on serverless hosts the default
 * function timeout is shorter than that. Generous, and still bounded.
 */
export const maxDuration = 30;

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true, suspended: true, allowedOrigins: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (org.suspended) {
    return NextResponse.json(
      { error: "This assistant is currently unavailable." },
      { status: 503 }
    );
  }

  // Public and unauthenticated, so two guards before any work is done:
  // where the request came from, and how many have come from there.
  const embedCheck = checkEmbedOrigin(request, org.allowedOrigins);
  if (embedCheck) return embedCheck;

  const limited = await rateLimit(`${clientAddress(request)}:${slug}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "You're sending messages too quickly — give it a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { message, conversationId, visitorToken, channel, visitorName, visitorEmail } =
    parsed.data;
  const config = await getAgentConfig(org.id);

  // Resuming a thread needs both the id and the token handed out when it was
  // created. The id alone isn't proof of anything on a public endpoint.
  let conversation =
    conversationId && visitorToken
      ? await db.conversation.findFirst({
          where: {
            id: conversationId,
            orgId: org.id,
            visitorToken,
          },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              select: { role: true, content: true, missed: true },
            },
          },
        })
      : null;

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        orgId: org.id,
        title: message.slice(0, 60),
        channel,
        status: "active",
        visitorToken: randomBytes(32).toString("hex"),
        // Who's asking, when the host site or the pre-chat form said.
        visitorName: visitorName || null,
        visitorEmail: visitorEmail || null,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true, missed: true },
        },
      },
    });
  }

  const history = conversation.messages.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  await db.message.create({
    data: { conversationId: conversation.id, role: "visitor", content: message },
  });

  // Once a teammate is in the conversation — or one has been called for — the
  // assistant stops answering. Talking over a human turns a hand-off into a
  // three-way argument, and the visitor came here to reach a person.
  const humanEngaged =
    conversation.status === "waiting" || conversation.status === "live";

  if (humanEngaged) {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await publish({
      type: "message.created",
      orgId: org.id,
      conversationId: conversation.id,
    });

    return NextResponse.json({
      conversationId: conversation.id,
      visitorToken: conversation.visitorToken,
      // No assistant reply: the teammate answers this one.
      message: null,
      escalated: true,
      awaitingHuman: true,
      engine: "Human",
    });
  }

  const articles = await db.knowledgeArticle.findMany({
    where: { orgId: org.id },
    select: { id: true, question: true, answer: true, category: true },
  });

  // How many times in a row the assistant has just failed. One miss earns a
  // suggestion and another try; two means rephrasing isn't working.
  let missStreak = 0;
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const entry = conversation.messages[index];
    if (entry.role === "visitor") continue;
    if (entry.role !== "assistant") break;
    if (entry.missed) missStreak += 1;
    else break;
  }

  const outcome = await answerQuestion({
    question: message,
    history,
    articles,
    settings: toAgentSettings(config),
    missStreak,
  });

  // Below the threshold the draft is withheld from the visitor and attached to
  // an escalation instead, so a person decides what actually gets said.
  const visibleContent = outcome.shouldEscalate
    ? escalationMessage()
    : outcome.answer;

  const reply = await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: visibleContent,
      confidence: outcome.confidence,
      sources: JSON.stringify(outcome.sources),
      // Drives the miss streak on the next turn: a suggestion counts as a
      // miss even though it wasn't escalated.
      missed: Boolean(outcome.suggestions) || outcome.shouldEscalate,
    },
  });

  if (outcome.shouldEscalate) {
    // A visitor asking a second unanswerable question shouldn't open a second
    // ticket: one conversation carries one open hand-off, refreshed with the
    // latest question so the teammate answers what was actually just asked.
    const open = await db.escalation.findFirst({
      where: { conversationId: conversation.id, orgId: org.id, status: "pending" },
      select: { id: true },
    });

    const dueAt = new Date(Date.now() + config.escalationTimeout * 60 * 1000);
    const details = {
      question: message,
      // A visitor asking for a person has no draft to review.
      draftAnswer:
        outcome.escalationReason === "visitor_request" ? null : outcome.answer,
      confidence: outcome.confidence,
      reason: outcome.escalationReason,
      // Route a voice hand-off to a live call and a chat hand-off to chat.
      channel: conversation.channel,
    };

    const escalation = open
      ? await db.escalation.update({
          where: { id: open.id },
          data: { ...details, dueAt },
        })
      : await db.escalation.create({
          data: {
            ...details,
            orgId: org.id,
            conversationId: conversation.id,
            dueAt,
          },
        });

    await db.conversation.update({
      where: { id: conversation.id },
      data: { status: "waiting", title: message.slice(0, 60) },
    });

    await publish({
      type: "escalation.created",
      orgId: org.id,
      escalationId: escalation.id,
    });
  } else {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { status: "active" },
    });

    // Track which articles are actually earning their keep.
    if (outcome.sources.length > 0) {
      await db.knowledgeArticle.updateMany({
        where: { id: { in: outcome.sources }, orgId: org.id },
        data: { useCount: { increment: 1 } },
      });
    }
  }

  await publish({
    type: "message.created",
    orgId: org.id,
    conversationId: conversation.id,
  });

  return NextResponse.json({
    conversationId: conversation.id,
    visitorToken: conversation.visitorToken,
    message: {
      id: reply.id,
      role: reply.role,
      content: reply.content,
      confidence: reply.confidence,
      createdAt: reply.createdAt,
    },
    escalated: outcome.shouldEscalate,
    awaitingHuman: outcome.shouldEscalate,
    suggestions: outcome.suggestions ?? [],
    engine: outcome.engine,
  });
}

/**
 * Public: the visitor polls their own conversation so a teammate's reply shows
 * up without a refresh. Requires both the conversation id and the visitor
 * token issued when the thread started.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  const visitorToken = request.nextUrl.searchParams.get("visitorToken");

  if (!conversationId || !visitorToken) {
    return NextResponse.json({ error: "Missing conversation" }, { status: 400 });
  }

  const conversation = await db.conversation.findFirst({
    // Token included in the lookup, so a mismatch is indistinguishable from a
    // conversation that doesn't exist.
    where: { id: conversationId, visitorToken, org: { slug } },
    select: {
      id: true,
      status: true,
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
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

/**
 * Enforces the tenant's embed allowlist.
 *
 * Empty means anywhere (the default while evaluating). Otherwise the request
 * must come from a listed origin — or from this app itself, so the public
 * /w/[slug] page and the Install preview keep working. Browsers send Origin
 * on cross-site POSTs, with Referer as the fallback for older ones.
 */
function checkEmbedOrigin(
  request: NextRequest,
  allowedOrigins: string
): NextResponse | null {
  const allowed = allowedOrigins
    .split(/\r?\n|,/)
    .map((line) => line.trim().replace(/\/+$/, "").toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return null;

  const self = new URL(request.url).origin.toLowerCase();
  const candidate = (request.headers.get("origin") ?? request.headers.get("referer") ?? "")
    .toLowerCase();

  let origin = "";
  try {
    origin = candidate ? new URL(candidate).origin : "";
  } catch {
    origin = "";
  }

  if (origin === self || allowed.includes(origin)) return null;

  return NextResponse.json(
    { error: "This assistant isn't available from this website." },
    { status: 403 }
  );
}
