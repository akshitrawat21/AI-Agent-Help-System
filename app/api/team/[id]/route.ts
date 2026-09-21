import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { fieldErrors, memberRoleSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = memberRoleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const orgId = auth.session.org.id;
  const membership = await db.membership.findFirst({ where: { id, orgId } });
  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Only owners can change an owner's role or promote someone to owner.
  const touchesOwnership =
    membership.role === "owner" || parsed.data.role === "owner";
  if (touchesOwnership && auth.session.role !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can change ownership" },
      { status: 403 }
    );
  }

  if (await wouldOrphanOrg(orgId, membership.id, membership.role, parsed.data.role)) {
    return NextResponse.json(
      { error: "A workspace needs at least one owner" },
      { status: 400 }
    );
  }

  await db.membership.update({ where: { id }, data: { role: parsed.data.role } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const orgId = auth.session.org.id;

  const membership = await db.membership.findFirst({ where: { id, orgId } });
  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (membership.role === "owner" && auth.session.role !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can remove an owner" },
      { status: 403 }
    );
  }

  if (await wouldOrphanOrg(orgId, membership.id, membership.role, null)) {
    return NextResponse.json(
      { error: "A workspace needs at least one owner" },
      { status: 400 }
    );
  }

  await db.membership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** Guards against removing or demoting the last owner. */
async function wouldOrphanOrg(
  orgId: string,
  membershipId: string,
  currentRole: string,
  nextRole: string | null
): Promise<boolean> {
  if (currentRole !== "owner" || nextRole === "owner") return false;

  const owners = await db.membership.count({ where: { orgId, role: "owner" } });
  return owners <= 1;
}
