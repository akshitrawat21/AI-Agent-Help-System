import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeSuperAdmin } from "@/lib/auth/guard";
import { switchSessionOrg } from "@/lib/auth/session";
import { fieldErrors } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  suspended: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

/** Suspend, reactivate or rename a tenant. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const org = await db.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const updated = await db.organization.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, slug: true, suspended: true },
  });

  return NextResponse.json({ tenant: updated });
}

/**
 * Enter a tenant's workspace.
 *
 * Grants the operator an owner membership if they don't already hold one,
 * then points their session at the tenant. Doing it through a real membership
 * — rather than a bypass — means every action they take inside is attributed
 * to them, visible on the tenant's Team page, and revocable.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await authorizeSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const org = await db.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  await db.membership.upsert({
    where: { userId_orgId: { userId: auth.session.user.id, orgId: id } },
    create: { userId: auth.session.user.id, orgId: id, role: "owner" },
    update: {},
  });

  await switchSessionOrg(auth.session.token, id);

  return NextResponse.json({ ok: true, slug: org.slug });
}

/** Permanently delete a tenant and everything in it. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authorizeSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await db.organization.deleteMany({ where: { id } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
