import { InstallGuide } from "@/components/app/install-guide";
import { PageHeader } from "@/components/app/page-header";
import { requireSession } from "@/lib/auth/guard";

export const metadata = { title: "Install" };

export default async function InstallPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Install"
        description="Put the assistant on your website with one line, or share a link. Everything your visitors say arrives here."
      />
      <InstallGuide slug={session.org.slug} orgName={session.org.name} />
    </div>
  );
}
