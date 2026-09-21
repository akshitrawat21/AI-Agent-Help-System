import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { fieldErrors, orgSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const parsed = orgSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { name, slug, allowedOrigins } = parsed.data;

  if (slug) {
    const taken = await db.organization.findFirst({
      where: { slug, id: { not: auth.session.org.id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { errors: { slug: "That address is already taken" } },
        { status: 409 }
      );
    }
  }

  const org = await db.organization.update({
    where: { id: auth.session.org.id },
    data: {
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(allowedOrigins !== undefined ? { allowedOrigins } : {}),
    },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ org });
}

export async function DELETE() {
  const auth = await authorize("owner");
  if ("response" in auth) return auth.response;

  // Cascades take out memberships, conversations, articles and escalations.
  await db.organization.delete({ where: { id: auth.session.org.id } });
  return NextResponse.json({ ok: true });
}
