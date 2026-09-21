import { KnowledgeManager } from "@/components/app/knowledge-manager";
import { PageHeader } from "@/components/app/page-header";
import { can, requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export const metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const session = await requireSession();

  const articles = await db.knowledgeArticle.findMany({
    where: { orgId: session.org.id },
    orderBy: { updatedAt: "desc" },
  });

  const initial = articles.map((article) => ({
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Knowledge"
        description="The only thing your assistant answers from. Anything not covered here goes to your team."
      />
      <KnowledgeManager initial={initial} canEdit={can(session.role, "admin")} />
    </div>
  );
}
