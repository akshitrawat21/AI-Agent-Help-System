import { TenantConsole, type Tenant } from "@/components/admin/tenant-console";
import { PageHeader } from "@/components/app/page-header";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { displayOwner } from "@/lib/tenants";

export const metadata = { title: "Platform" };

const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

/**
 * The operator's view above every tenant. Lives inside the authenticated
 * shell so the operator keeps their own workspace navigation, but is gated
 * separately — an org role never grants this.
 */
export default async function AdminPage() {
  await requireSuperAdmin();

  const since = new Date(Date.now() - PRESENCE_WINDOW_MS);

  const [orgs, pending, online] = await Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, conversations: true, articles: true } },
        memberships: {
          where: { role: "owner" },
          orderBy: { createdAt: "asc" },
          include: { user: { select: { name: true, email: true, isSuperAdmin: true } } },
        },
      },
    }),
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

  const pendingByOrg = Object.fromEntries(pending.map((r) => [r.orgId, r._count._all]));
  const onlineByOrg = Object.fromEntries(online.map((r) => [r.orgId, r._count._all]));

  const tenants: Tenant[] = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    suspended: org.suspended,
    createdAt: org.createdAt.toISOString(),
    owner: displayOwner(org.memberships),
    staff: org._count.memberships,
    staffOnline: onlineByOrg[org.id] ?? 0,
    conversations: org._count.conversations,
    articles: org._count.articles,
    pendingEscalations: pendingByOrg[org.id] ?? 0,
  }));

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Platform"
        description="Every client workspace on this deployment. Enter one to see it exactly as its owner does."
      />
      <TenantConsole initial={tenants} />
    </div>
  );
}
