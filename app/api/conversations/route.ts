import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { sweepOverdueEscalations } from "@/lib/escalations";

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const orgId = auth.session.org.id;
  await sweepOverdueEscalations(orgId);

  const status = request.nextUrl.searchParams.get("status");
  const search = request.nextUrl.searchParams.get("search")?.trim();

  const conversations = await db.conversation.findMany({
    where: {
      orgId,
      ...(status && status !== "all" ? { status } : {}),
      // Case-insensitive explicitly: Postgres `contains` is not.
      ...(search
        ? { title: { contains: search, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { role: true, content: true, confidence: true, createdAt: true },
      },
      escalations: {
        where: { status: "pending" },
        select: { id: true },
      },
    },
  });

  const counts = await db.conversation.groupBy({
    by: ["status"],
    where: { orgId },
    _count: { _all: true },
  });

  return NextResponse.json({
    conversations,
    counts: Object.fromEntries(
      counts.map((entry) => [entry.status, entry._count._all])
    ),
  });
}
