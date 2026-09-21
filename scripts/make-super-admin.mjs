/**
 * Flags an existing user as platform super admin:
 *
 *   npm run make-super-admin -- you@company.com
 *
 * On a fresh deployment there's an easier path: set SUPER_ADMIN_EMAIL before
 * signing up and the account is created with the flag. This script is for the
 * case where the account already exists.
 */
import { PrismaClient } from "@prisma/client";
import { requireDatabaseUrl } from "./lib/database-url.mjs";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-super-admin -- you@company.com");
  process.exit(1);
}

// Fail with an explanation rather than a Prisma stack trace.
requireDatabaseUrl();

const db = new PrismaClient();

try {
  const result = await db.user.updateMany({
    where: { email },
    data: { isSuperAdmin: true },
  });

  if (result.count === 0) {
    console.error(`No account uses ${email}. Sign up with it first, then run this again.`);
    process.exit(1);
  }

  console.log(`${email} is now a platform super admin. Sign out and back in to see /admin.`);
} finally {
  await db.$disconnect();
}
