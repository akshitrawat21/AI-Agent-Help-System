/**
 * Idempotent first-run setup, wired into `npm run dev`.
 *
 * Creates .env from the example, generates the Prisma client, pushes the
 * schema to Postgres, and seeds a demo workspace the first time the database
 * comes up empty. Safe to run repeatedly — it never touches existing data.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { requireDatabaseUrl } from "./lib/database-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    ...options,
  });
}

/** Runs a command, capturing output instead of failing the process. */
function tryRun(command, args) {
  try {
    const output = execFileSync(command, args, {
      cwd: root,
      shell: true,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

function step(message) {
  console.log(`\x1b[2m→\x1b[0m ${message}`);
}

function fail(lines) {
  console.error(`\n\x1b[31m${lines[0]}\x1b[0m`);
  for (const line of lines.slice(1)) console.error(line);
  console.error("");
  process.exit(1);
}

const HOW_TO_GET_POSTGRES = [
  "  Start one, then run this again:",
  "",
  "    • Docker:      npm run db:up",
  "    • Existing PG: createdb helpdesk_ai",
  "                   then set DATABASE_URL in .env to point at it",
];

// 1. Environment file. Nothing in it is secret by default — sessions are
//    opaque random tokens checked against the database, not signed cookies.
if (!existsSync(envPath)) {
  step("Creating .env");
  copyFileSync(examplePath, envPath);
}

// 2. Validate the connection string before handing it to Prisma, so a typo
//    or a stale shell variable produces a pointed message instead of a
//    schema-validation stack trace.
const { value: databaseUrl, source } = requireDatabaseUrl();

// 3. Prisma client. Cheap when already generated, so it runs every time and
//    can never be stale relative to the schema.
step("Generating Prisma client");
const generated = tryRun("npx", ["prisma", "generate"]);

if (!generated.ok) {
  // On Windows a running dev server holds the query-engine DLL open, so the
  // rename fails with EPERM. The client it is holding was generated fine, so
  // carry on rather than blocking a routine restart — but say so, because a
  // schema change won't have been picked up.
  const locked = /EPERM|EBUSY|operation not permitted/i.test(generated.output);
  const clientExists = existsSync(
    path.join(root, "node_modules", ".prisma", "client")
  );

  if (locked && clientExists) {
    console.log(
      "[33m  ! Another process is using the Prisma engine (usually a running[0m"
    );
    console.log(
      "[33m    dev server), so the client wasn't regenerated. Continuing with[0m"
    );
    console.log(
      "[33m    the existing one — restart it if you changed the schema.[0m"
    );
  } else {
    console.error(generated.output);
    fail([
      "Couldn't generate the Prisma client.",
      "",
      "  The output above should say why. If a dev server is running, stop it",
      "  and try again.",
    ]);
  }
}

// 4. Schema. First thing that needs a reachable server, so its failure is
//    where we explain how to get one.
step("Syncing the database schema");
try {
  run("npx", ["prisma", "db", "push", "--skip-generate"]);
} catch {
  let target = databaseUrl;
  try {
    const parsed = new URL(databaseUrl);
    target = `${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`;
  } catch {
    // Keep the raw string if it somehow isn't parseable.
  }

  fail([
    `Couldn't reach Postgres at ${target}.`,
    "",
    `  DATABASE_URL comes from ${source === "environment" ? "the shell environment" : ".env"}.`,
    "",
    ...HOW_TO_GET_POSTGRES,
  ]);
}

// 5. Demo data, but only into a genuinely empty database — never over real work.
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

let organizations = 0;
try {
  organizations = await db.organization.count();
} finally {
  await db.$disconnect();
}

if (organizations === 0) {
  step("Seeding a demo workspace");
  run("node", ["prisma/seed.mjs"]);

  console.log("");
  console.log("  \x1b[1mReady.\x1b[0m Sign in at /login with:");
  console.log("    demo@example.com / demo1234");
  console.log("");
}
