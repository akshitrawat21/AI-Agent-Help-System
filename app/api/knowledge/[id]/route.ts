import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { articleSchema, fieldErrors } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = articleSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  // Scope the write by org so an id from another tenant can't be touched.
  const result = await db.knowledgeArticle.updateMany({
    where: { id, orgId: auth.session.org.id },
    data: parsed.data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const article = await db.knowledgeArticle.findUnique({ where: { id } });
  return NextResponse.json({ article });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await db.knowledgeArticle.deleteMany({
    where: { id, orgId: auth.session.org.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
