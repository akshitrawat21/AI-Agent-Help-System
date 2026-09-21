/**
 * Starts the local Postgres container, booting the Docker engine first if it
 * isn't already up.
 *
 * Docker Desktop doesn't start on login by default, so a plain
 * `docker compose up` fails with a daemon-socket error after every reboot.
 * This waits for the engine instead of making that the developer's problem.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where Docker Desktop lives, per platform. */
const DESKTOP_PATHS = {
  win32: [
    "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
    "C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe",
  ],
  darwin: ["/Applications/Docker.app"],
  linux: [],
};

const ENGINE_TIMEOUT_MS = 150_000;
const POLL_MS = 3_000;

function log(message) {
  console.log(`\x1b[2m→\x1b[0m ${message}`);
}

function fail(lines) {
  console.error(`\n\x1b[31m${lines[0]}\x1b[0m`);
  for (const line of lines.slice(1)) console.error(line);
  console.error("");
  process.exit(1);
}

/**
 * True once the engine can actually serve work.
 *
 * `docker info` is not a sufficient probe: on a cold start the daemon reports
 * a version several seconds before its image store is ready, and `docker
 * compose up` then fails with a 500 from the images API. Listing images hits
 * that same subsystem, so it only passes when compose will too.
 */
function engineUp() {
  try {
    execFileSync("docker", ["image", "ls", "--quiet"], {
      stdio: "ignore",
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

function dockerCliPresent() {
  try {
    execFileSync("docker", ["--version"], { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!dockerCliPresent()) {
  fail([
    "Docker isn't installed (no `docker` on PATH).",
    "",
    "  Either install Docker Desktop — https://docs.docker.com/get-docker/ —",
    "  or use a Postgres you already have:",
    "",
    "    createdb helpdesk_ai",
    "    # then in .env:",
    '    DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/helpdesk_ai"',
  ]);
}

if (!engineUp()) {
  const candidates = DESKTOP_PATHS[process.platform] ?? [];
  const desktop = candidates.find((candidate) => existsSync(candidate));

  if (!desktop) {
    fail([
      "The Docker engine isn't running.",
      "",
      "  Start it and run this again. (Docker Desktop wasn't found in its",
      "  usual location, so it couldn't be started automatically.)",
    ]);
  }

  log("Docker engine is down — starting Docker Desktop");

  // Detached: Docker Desktop is a long-lived GUI app, so this script must not
  // wait on the process, only on the engine becoming reachable.
  const child =
    process.platform === "darwin"
      ? spawn("open", ["-a", desktop], { detached: true, stdio: "ignore" })
      : spawn(desktop, [], { detached: true, stdio: "ignore" });
  child.unref();

  const started = Date.now();
  const deadline = started + ENGINE_TIMEOUT_MS;
  let ready = false;
  let announced = 0;

  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    if (engineUp()) {
      ready = true;
      break;
    }

    // Say something every 15s so a slow boot doesn't look like a hang.
    const waited = Math.floor((Date.now() - started) / 1000);
    if (waited - announced >= 15) {
      announced = waited;
      log(`Still waiting for the engine (${waited}s)`);
    }
  }

  if (!ready) {
    fail([
      "Docker Desktop is running but its engine never became usable.",
      "",
      "  If it was previously killed rather than quit, the engine can get",
      "  stuck. A clean restart fixes it:",
      "",
      "    wsl --shutdown",
      '    then reopen Docker Desktop, and run `npm run db:up` again',
    ]);
  }

  log("Docker engine ready");
}

log("Starting Postgres");

// Retry a couple of times: even past the readiness probe, a freshly booted
// engine can transiently fail the first compose call.
const ATTEMPTS = 3;
let started = false;

for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    execFileSync("docker", ["compose", "up", "-d", "--wait"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
    started = true;
    break;
  } catch {
    if (attempt < ATTEMPTS) {
      log(`Engine still settling — retrying (${attempt}/${ATTEMPTS - 1})`);
      await sleep(5_000);
    }
  }
}

if (!started) {
  fail([
    "Postgres didn't start.",
    "",
    "  Check the container's logs:",
    "",
    "    docker compose logs postgres",
  ]);
}
