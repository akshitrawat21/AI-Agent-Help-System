import { PageHeader } from "@/components/app/page-header";
import { WorkspaceSettings } from "@/components/app/workspace-settings";
import { can, requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const org = await db.organization.findUnique({
    where: { id: session.org.id },
    select: { allowedOrigins: true },
  });

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Settings"
        description="Your workspace details and how customers reach your assistant."
      />
      <WorkspaceSettings
        org={{ ...session.org, allowedOrigins: org?.allowedOrigins ?? "" }}
        isOwner={session.role === "owner"}
        canEdit={can(session.role, "admin")}
      />
    </div>
  );
}
