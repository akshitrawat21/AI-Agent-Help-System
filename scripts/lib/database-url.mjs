/**
 * Resolves and validates DATABASE_URL the same way Prisma does, so every
 * entry point fails with the same clear message instead of a stack trace.
 *
 * Shared by scripts/setup.mjs, scripts/reset.mjs and prisma/seed.mjs.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
const envPath = path.join(root, ".env");

/**
 * Strips one matching pair of wrapping quotes.
 *
 * `set VAR="postgres://..."` in cmd, and several editor/task runners, keep the
 * quotes as part of the value. A connection string never legitimately starts
 * and ends with a quote, so removing them is unambiguous — and far better than
 * failing a command the user can't easily fix from inside their shell.
 */
export function stripWrappingQuotes(value) {
  if (typeof value !== "string" || value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' || first === "'") && first === last) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Where the value came from, because that determines how to fix it.
 *
 * Precedence matches Prisma and Next: a real environment variable wins over
 * .env. That is the surprising part when it goes wrong — a stale shell
 * variable silently overrides a perfectly good .env file.
 */
export function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    const raw = process.env.DATABASE_URL;
    const value = stripWrappingQuotes(raw);
    return { value, source: "environment", repaired: value !== raw };
  }

  if (!existsSync(envPath)) return { value: null, source: null };

  // This script has no dotenv of its own — Prisma loads .env inside its own
  // process — so read the file directly rather than reporting "not set".
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((text) => text.trimStart().startsWith("DATABASE_URL="))
    .pop();

  if (!line) return { value: null, source: null };

  let value = line.slice(line.indexOf("=") + 1).trim();
  // Strip one layer of matching quotes, the way dotenv does.
  if (
    value.length > 1 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }

  return { value: value || null, source: ".env" };
}

function report(lines) {
  console.error(`\n\x1b[31m${lines[0]}\x1b[0m`);
  for (const line of lines.slice(1)) console.error(line);
  console.error("");
  process.exit(1);
}

const EXAMPLE =
  '    DATABASE_URL="postgresql://helpdesk:helpdesk@localhost:5433/helpdesk_ai"';

/** Returns a valid connection string, or exits with an explanation. */
export function requireDatabaseUrl() {
  const { value, source, repaired } = resolveDatabaseUrl();

  if (repaired) {
    console.warn(
      "[33m  ! DATABASE_URL is set in your shell with the quotes included in[0m"
    );
    console.warn(
      "[33m    the value. Using it anyway with the quotes stripped. To stop the[0m"
    );
    console.warn(
      "[33m    warning: Remove-Item Env:DATABASE_URL (PowerShell), or open a[0m"
    );
    console.warn("[33m    new terminal so .env is used instead.[0m");

    // Put the repaired value back so child processes and any PrismaClient
    // constructed after this inherit the usable one.
    process.env.DATABASE_URL = value;
  }

  if (!value) {
    report([
      "DATABASE_URL isn't set.",
      "",
      `  Add it to ${envPath}, for example:`,
      "",
      EXAMPLE,
    ]);
  }

  if (/^postgres(ql)?:\/\//.test(value)) return { value, source, repaired };

  const lines = [
    "DATABASE_URL isn't a Postgres connection string.",
    "",
    `  Found in ${source === "environment" ? "the shell environment" : ".env"}:`,
    `    ${JSON.stringify(value)}`,
    "",
    "  It has to start with postgresql:// or postgres://.",
  ];

  if (source === "environment") {
    // The quotes are part of the value, which is what `set VAR="..."` in cmd
    // produces. And because a real variable outranks .env, a good .env file
    // can't rescue it — it has to be cleared.
    lines.push(
      "",
      "  This is set as a shell variable, which overrides .env — so fixing",
      "  .env alone won't help. Clear it:",
      "",
      "    PowerShell:  Remove-Item Env:DATABASE_URL",
      "    bash/zsh:    unset DATABASE_URL",
      "",
      "  It isn't persisted, so opening a new terminal also clears it.",
      "  Then .env takes over again."
    );
  } else {
    lines.push(
      "",
      "  A common cause is doubled or mismatched quotes — the value needs at",
      "  most one matching pair:",
      "",
      EXAMPLE
    );
  }

  report(lines);
}
