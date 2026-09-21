import { PageHeader } from "@/components/app/page-header";
import { TeamManager, type Member } from "@/components/app/team-manager";
import { can, requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const session = await requireSession();
  const orgId = session.org.id;

  const [memberships, answered] = await Promise.all([
    db.membership.findMany({
      where: { orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.escalation.groupBy({
      by: ["assigneeId"],
      where: { orgId, status: "answered" },
      _count: { _all: true },
    }),
  ]);

  const answeredByUser = Object.fromEntries(
    answered
      .filter((entry) => entry.assigneeId)
      .map((entry) => [entry.assigneeId as string, entry._count._all])
  );

  const members: Member[] = memberships.map((membership) => ({
    membershipId: membership.id,
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    avatarColor: membership.user.avatarColor,
    role: membership.role,
    joinedAt: membership.createdAt.toISOString(),
    answered: answeredByUser[membership.user.id] ?? 0,
  }));

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Team"
        description="Who can answer escalations and manage the assistant."
      />
      <TeamManager
        initial={members}
        currentUserId={session.user.id}
        currentRole={session.role}
        canManage={can(session.role, "admin")}
      />
    </div>
  );
}
