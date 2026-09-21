import { AppShell } from "@/components/app/app-shell";
import { requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { sweepOverdueEscalations } from "@/lib/escalations";

/**
 * Every route under this group is authenticated and scoped to one workspace.
 * The sweep runs here so the escalation badge is accurate on any entry point.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  await sweepOverdueEscalations(session.org.id);

  const [pendingCount, org] = await Promise.all([
    db.escalation.count({
      where: { orgId: session.org.id, status: "pending" },
    }),
    db.organization.findUnique({
      where: { id: session.org.id },
      select: { suspended: true },
    }),
  ]);

  return (
    <AppShell session={session} pendingCount={pendingCount}>
      {org?.suspended && (
        // Staff can still work the inbox and knowledge base; visitors can't
        // reach the assistant. Say so plainly rather than letting them wonder
        // why nothing new is arriving.
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-[13px]">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" />
          <div>
            <p className="font-medium">This workspace is suspended</p>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">
              Your public assistant is offline and won't take new conversations
              until the platform operator reactivates it. Everything here still
              works.
            </p>
          </div>
        </div>
      )}
      {children}
    </AppShell>
  );
}
