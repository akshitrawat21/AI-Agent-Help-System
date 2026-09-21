/**
 * Wipes all data and reseeds the demo workspace. Used by `npm run db:reset`.
 *
 * Clears rows rather than deleting the database file: on Windows a running
 * dev server keeps a handle on dev.db, so unlinking it fails with EBUSY. Row
 * deletes work either way, and leave the schema in place.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireDatabaseUrl } from "./lib/database-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Fail with an explanation rather than a Prisma stack trace.
requireDatabaseUrl();

const db = new PrismaClient();

try {
  console.log("→ Clearing existing data");

  // Organizations and users are the two roots; every other table hangs off
  // one of them by a cascading relation.
  await db.organization.deleteMany();
  await db.user.deleteMany();

  console.log("→ Seeding demo data");
} finally {
  await db.$disconnect();
}

execFileSync("node", ["prisma/seed.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
