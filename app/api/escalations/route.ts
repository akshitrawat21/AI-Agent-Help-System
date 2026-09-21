import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { sweepOverdueEscalations } from "@/lib/escalations";

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const orgId = auth.session.org.id;
  await sweepOverdueEscalations(orgId);

  const status = request.nextUrl.searchParams.get("status") ?? "pending";

  const escalations = await db.escalation.findMany({
    where: { orgId, ...(status === "all" ? {} : { status }) },
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
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const counts = await db.escalation.groupBy({
    by: ["status"],
    where: { orgId },
    _count: { _all: true },
  });

  return NextResponse.json({
    escalations,
    counts: Object.fromEntries(
      counts.map((entry) => [entry.status, entry._count._all])
    ),
  });
}
