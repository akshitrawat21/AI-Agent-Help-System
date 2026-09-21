import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const conversation = await db.conversation.findFirst({
    where: { id, orgId: auth.session.org.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarColor: true } },
        },
      },
      escalations: {
        orderBy: { createdAt: "desc" },
        include: {
          assignee: { select: { id: true, name: true, avatarColor: true } },
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Resolve the article ids cited by assistant messages for the sources panel.
  const sourceIds = [
    ...new Set(
      conversation.messages.flatMap((message) => {
        try {
          return JSON.parse(message.sources) as string[];
        } catch {
          return [];
        }
      })
    ),
  ];

  const sources = sourceIds.length
    ? await db.knowledgeArticle.findMany({
        where: { id: { in: sourceIds }, orgId: auth.session.org.id },
        select: { id: true, question: true, category: true },
      })
    : [];

  return NextResponse.json({ conversation, sources });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const { status } = await request.json();

  if (!["active", "waiting", "resolved", "missed"].includes(status)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }

  const result = await db.conversation.updateMany({
    where: { id, orgId: auth.session.org.id },
    data: { status },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
