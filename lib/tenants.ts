import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const COLORS = ["slate", "blue", "violet", "emerald", "amber", "rose"];

/** Deterministic avatar tint from an email, so re-seeding is stable. */
export function pickColor(seed: string): string {
  const sum = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

/** URL-safe slug from a name, made unique with a numeric suffix if taken. */
export async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "workspace";

  let candidate = base;
  let suffix = 2;
  while (await db.organization.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Creates a tenant with its owner in one step. Used by self-serve signup and
 * by the platform console, so both paths produce an identical workspace:
 * an organization, default assistant settings, and one owner membership.
 *
 * If the owner's email already has an account, that account is made owner of
 * the new workspace rather than failing — a person can run several tenants.
 */
export async function createTenant(input: {
  orgName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}) {
  const slug = await uniqueSlug(input.orgName);

  const existing = await db.user.findUnique({
    where: { email: input.ownerEmail },
  });

  const org = await db.organization.create({
    data: {
      name: input.orgName,
      slug,
      // Defaults are good enough to start answering immediately.
      agentConfig: { create: {} },
    },
  });

  const owner =
    existing ??
    (await db.user.create({
      data: {
        name: input.ownerName,
        email: input.ownerEmail,
        passwordHash: await hashPassword(input.ownerPassword),
        avatarColor: pickColor(input.ownerEmail),
        isSuperAdmin: isBootstrapSuperAdmin(input.ownerEmail),
      },
    }));

  await db.membership.create({
    data: { userId: owner.id, orgId: org.id, role: "owner" },
  });

  return { org, owner, ownerExisted: Boolean(existing) };
}

/**
 * The first platform operator is bootstrapped by email: whoever signs up as
 * SUPER_ADMIN_EMAIL gets the flag, so a fresh deployment needs no SQL. For a
 * user who already exists, `npm run make-super-admin -- email` does the same.
 */
function isBootstrapSuperAdmin(email: string): boolean {
  const configured = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configured) && email.trim().toLowerCase() === configured;
}

/**
 * The owner to show for a tenant in the platform console.
 *
 * A super admin who entered a workspace holds an owner membership there too,
 * so prefer a real customer owner and only fall back to the platform admin
 * when nobody else owns it.
 */
export function displayOwner<
  T extends { user: { name: string; email: string; isSuperAdmin: boolean } },
>(owners: T[]): { name: string; email: string } | null {
  const pick = owners.find((o) => !o.user.isSuperAdmin) ?? owners[0];
  return pick ? { name: pick.user.name, email: pick.user.email } : null;
}
