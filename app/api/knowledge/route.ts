import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { articleSchema, fieldErrors } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const category = request.nextUrl.searchParams.get("category")?.trim();

  const articles = await db.knowledgeArticle.findMany({
    where: {
      orgId: auth.session.org.id,
      ...(category && category !== "All" ? { category } : {}),
      // Postgres `contains` is case-sensitive by default, so searching
      // "Billing" would miss "billing" without this.
      ...(search
        ? {
            OR: [
              { question: { contains: search, mode: "insensitive" as const } },
              { answer: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ articles });
}

export async function POST(request: NextRequest) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const parsed = articleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const article = await db.knowledgeArticle.create({
    data: { ...parsed.data, orgId: auth.session.org.id },
  });

  return NextResponse.json({ article }, { status: 201 });
}
