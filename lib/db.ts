import { PrismaClient } from "@prisma/client";

/**
 * Repair a DATABASE_URL whose value includes its own quotes.
 *
 * `set VAR="postgres://..."` in cmd — and a few editor/task runners — keep the
 * quote characters as part of the value. A real environment variable outranks
 * .env for both Next and Prisma, so one stale shell variable takes down the
 * whole app with a protocol error that looks like a schema problem.
 *
 * A connection string never legitimately starts and ends with a quote, so
 * stripping one matching pair is unambiguous. This runs before the client is
 * constructed because Prisma resolves `env("DATABASE_URL")` at that moment.
 */
const url = process.env.DATABASE_URL;
if (url && url.length > 1) {
  const first = url[0];
  if ((first === '"' || first === "'") && url.at(-1) === first) {
    process.env.DATABASE_URL = url.slice(1, -1);
    console.warn(
      "[db] DATABASE_URL was quoted in the environment; using it with the quotes stripped."
    );
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Reuse the client across hot reloads so dev doesn't exhaust connections.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
