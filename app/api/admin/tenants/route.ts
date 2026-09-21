import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeSuperAdmin } from "@/lib/auth/guard";
import { createTenant, displayOwner } from "@/lib/tenants";
import { fieldErrors } from "@/lib/validation";

const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

/** Every tenant on the platform, with the numbers an operator looks at. */
export async function GET() {
  const auth = await authorizeSuperAdmin();
  if ("response" in auth) return auth.response;

  const since = new Date(Date.now() - PRESENCE_WINDOW_MS);

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { memberships: true, conversations: true, articles: true },
      },
      memberships: {
        where: { role: "owner" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true, isSuperAdmin: true } } },
      },
    },
  });

  // Pending escalations and online staff, grouped in two queries rather than
  // one per tenant.
  const [pending, online] = await Promise.all([
    db.escalation.groupBy({
      by: ["orgId"],
      where: { status: "pending" },
      _count: { _all: true },
    }),
    db.membership.groupBy({
      by: ["orgId"],
      where: { lastSeenAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const pendingByOrg = Object.fromEntries(
    pending.map((row) => [row.orgId, row._count._all])
  );
  const onlineByOrg = Object.fromEntries(
    online.map((row) => [row.orgId, row._count._all])
  );

  return NextResponse.json({
    tenants: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      suspended: org.suspended,
      createdAt: org.createdAt,
      owner: displayOwner(org.memberships),
      staff: org._count.memberships,
      staffOnline: onlineByOrg[org.id] ?? 0,
      conversations: org._count.conversations,
      articles: org._count.articles,
      pendingEscalations: pendingByOrg[org.id] ?? 0,
    })),
  });
}

const createSchema = z.object({
  orgName: z.string().trim().min(1, "Workspace name is required").max(80),
  ownerName: z.string().trim().min(1, "Owner name is required").max(80),
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid email"),
  ownerPassword: z.string().min(8, "Use at least 8 characters").max(200),
});

/** Provision a tenant on a client's behalf. */
export async function POST(request: NextRequest) {
  const auth = await authorizeSuperAdmin();
  if ("response" in auth) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { org, ownerExisted } = await createTenant(parsed.data);

  return NextResponse.json(
    { tenant: { id: org.id, name: org.name, slug: org.slug }, ownerExisted },
    { status: 201 }
  );
}
