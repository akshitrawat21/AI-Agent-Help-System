# Helpdesk AI

A multi-tenant support SaaS built around one idea: **the assistant scores its own
confidence, and hands the question to a human whenever it isn't sure.**

Every answer is grounded in the workspace's knowledge base and scored before it
is sent. Above the org's threshold it goes to the visitor. Below it, the draft is
withheld, an escalation is opened with an SLA clock, and a teammate answers
instead — and that answer is saved back into the knowledge base, so the same
question never reaches a human twice.

It needs **no API key** — the assistant works on a built-in retrieval engine
until you add one.

---

## Quick start

Postgres has to be reachable. The quickest way is the bundled container:

```bash
npm install
npm run db:up     # Postgres 17 on port 5433, waits until healthy
npm run dev
```

`db:up` starts the Docker engine itself if it isn't running, so it works from
a cold boot without opening Docker Desktop by hand.

Open <http://localhost:3000>. First run creates `.env`, pushes the schema, and
seeds a demo workspace.

**Already have a Postgres you'd rather use?** Skip `db:up`, create the database,
and point `DATABASE_URL` at it:

```bash
createdb helpdesk_ai
# .env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/helpdesk_ai"
```

The container uses port **5433** on purpose, so it can't collide with a
Postgres already installed on the host at 5432.

Sign in with any of:

| Email | Password | Role |
| --- | --- | --- |
| `demo@example.com` | `demo1234` | Owner |
| `sam@example.com` | `demo1234` | Admin |
| `riley@example.com` | `demo1234` | Agent |
| `root@example.com` | `demo1234` | Platform admin — also sees `/admin` |

The customer-facing assistant for the demo workspace is at
<http://localhost:3000/w/northwind>.

### Try the loop end to end

1. Open `/w/northwind` and ask **"how long does shipping take?"** — answered from
   the knowledge base with high confidence.
2. Ask **"Do you support SAML single sign-on?"** — nothing in the knowledge base
   covers it, so the assistant withholds its draft and says a teammate will reply.
3. In the app, open **Escalations**. The question is waiting, with the confidence
   score, the reason, an SLA countdown, and the draft that was held back.
4. Write an answer and send it. Leave *Teach the assistant this answer* checked.
5. Back on `/w/northwind`, the reply appears in the visitor's conversation.
6. Ask the same question again — it is now answered automatically.

---

## How the assistant decides

A hand-off costs a teammate's attention, so the assistant earns it rather than
reaching for it. Escalation is the last step, not the first:

```
visitor message
      │
      ├─ small talk? ────────────────► answer it ("hi", "thanks", "what can you do")
      │
      ├─ asked for a human? ─────────► hand off
      │
      ├─ said the answer was wrong? ─► hand off
      │
      ▼
  retrieve from knowledge base (BM25 + synonym bridging)
      │
      ├─ confidence ≥ threshold ─────► answer, count article usage
      │
      ├─ first miss ─────────────────► "did you mean…" + suggested questions
      │
      └─ second miss in a row ───────► hand off
```

**Confidence is IDF-weighted coverage**: of the things the visitor actually asked
about, how many does the winning article address — directly, or through a synonym?

The three things that change the outcome:

- **Chit-chat never reaches the queue.** A knowledge base has no article about
  being greeted, so without an intent layer every "hi" scores near zero and
  lands on a human. Greetings, thanks, "who are you", "what can you do" are
  answered by the assistant itself.
- **A miss recommends before it escalates.** Most misses are a wording
  mismatch, so the first one offers the closest real questions to click. Only a
  second consecutive miss hands off.
- **The visitor can always override.** "I need a human" hands off immediately,
  and so does any sign the last answer missed ("that's not what I asked").

## Hand-offs stay in their channel

A hand-off keeps the conversation in the medium it started in, and keeps it
**open** rather than closing it after one reply:

| Started in | Becomes | The teammate sees |
| --- | --- | --- |
| Voice | A live call — replies are read aloud, and the visitor answers by voice | **Live call** badge in the queue |
| Chat / widget | A live chat | **Chat** badge |

Answering an escalation sets the conversation to **live**, not resolved. From
then on the assistant stays out of it — visitor messages go straight to the
teammate, who replies from the inbox until they close it. That is what makes it
a conversation rather than a ticket with one canned answer.

---

## Voice

The public assistant has a **Voice** mode alongside Chat. It's a hands-free
loop, built entirely on the browser's own speech engine — no key, no telephony
vendor, and no audio leaves the visitor's device:

```
tap to start
    │
    ▼
listening ──(utterance)──► thinking ──► speaking ──┐
    ▲                                              │
    └──────────────────────────────────────────────-┘
```

The microphone is closed for the whole reply, otherwise recognition hears the
assistant through the speakers and the call talks to itself. Spoken turns are
ordinary conversation rows — they show up in the inbox tagged as the `voice`
channel, and escalate to a human on low confidence exactly like typed ones,
with the hand-off announced out loud.

Chat mode keeps a mic button for dictation, which appends to whatever is
already typed rather than replacing it.

Voice needs both halves of the Web Speech API, so the toggle only appears when
the browser has them — Chrome, Edge and Safari do; Firefox has no
`SpeechRecognition`, and gracefully falls back to chat only. Turn it off per
workspace under **Assistant → Voice conversations**.

---

## The engine

The assistant works out of the box on the **built-in engine**: local retrieval
over the knowledge base, returning the matching answer verbatim and escalating
anything it can't ground in an article. No key, no network calls, no vendor.

To have a hosted model phrase the replies instead, go to **Assistant → Engine**
and pick Anthropic or OpenAI, then paste a key (stored per workspace, never
returned to the browser). You can also set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
in `.env` as a fallback for every workspace.

If a hosted provider is unreachable or rejects the key, the assistant falls back
to the built-in engine rather than failing the conversation.

---

## Design

Airy and editorial. The tokens live in `app/globals.css`:

- **Type.** Geist for everything functional. EB Garamond (`.display`) only at
  hero scale — the landing headline, the sign-in titles — never in data UI.
- **Colour.** Neutrals lean periwinkle rather than grey, so every screen sits at
  the same temperature as the sky hero. One azure carries every action; warmth
  is reserved for status.
- **Surfaces.** `.sky` (the hero gradient, sun and haze), `.periwinkle-field`
  (the closing section) and `.glossy` (the lit primary button) are the only
  decorative utilities. They are gradients, not images, so they scale to any
  width and recolour in dark mode.
- **Dark mode** is a deep cool navy, not neutral black — the same palette at
  night rather than a different product.
- **Motion.** Short, eased, and gone: entrances rise a few pixels over
  ~300ms and nothing loops except the ring on an "online" dot. `.stagger` on
  any list or grid enters its children one after another; `<Reveal>`
  (`components/motion/reveal.tsx`) rises a section in when it scrolls into
  view; `.animate-pop` announces a new message or badge; `.hover-lift` is
  for cards that are links; `.skeleton` shimmers in `app/(app)/app/loading.tsx`
  while a route streams in. `prefers-reduced-motion` snaps everything to its
  final state — spinners excepted, since they carry information.

---

## Tech

| | |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Radix primitives |
| Database | Prisma 6 + Postgres 17 |
| Auth | scrypt (`node:crypto`) + DB-backed httpOnly cookie sessions |
| Realtime | Server-sent events over an in-process event bus |
| Voice | Web Speech API (recognition + synthesis) — browser-native, no key |
| Models | Built-in retrieval, Anthropic, OpenAI |

No native modules, no background workers, no message broker. One app process
plus Postgres.

### Multi-tenancy

Tenant data is separated by an `orgId` column, not by database or schema. Every
query in `app/api/**` and every server component under `app/(app)/**` is scoped
to the caller's organization, and writes use `updateMany`/`deleteMany` with
`orgId` in the `where` clause so an id from another tenant matches nothing.

---

## Surfaces

**App** (authenticated, scoped to one workspace)

| Route | What it does |
| --- | --- |
| `/app` | Auto-resolve rate, average confidence, queue depth, median reply time, 14-day volume |
| `/app/inbox` | Every conversation, with the confidence behind each reply and the articles used. Reply to take over |
| `/app/escalations` | The queue. Transcript, withheld draft, SLA countdown, claim, answer + teach |
| `/app/knowledge` | Article CRUD with search and categories. Learned articles are marked |
| `/app/assistant` | Name, greeting, persona, tone, threshold, SLA window, engine and key, ask who's asking |
| `/app/team` | Members, roles, per-person answered counts |
| `/app/install` | Embed snippet with launcher options, shareable link, live preview |
| `/app/settings` | Workspace name, public address, websites allowed to embed |
| `/admin` | Platform console: every workspace — create, suspend, enter, delete (super admin only) |

**Public**

| Route | What it does |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Signup creates the user and their first workspace together |
| `/w/[slug]` | The customer-facing assistant. Chat and voice, no account needed |

### Embedding

The snippet, launcher options, a shareable link and a live preview are on
`/app/install`. At its simplest:

```html
<script src="https://your-host/embed.js" data-workspace="northwind" defer></script>
```

Adds a launcher button that opens the assistant in a panel. Optional
`data-position="left"` and `data-accent="#3d7bf7"`. If the host page knows who
is signed in, pass `data-name` and `data-email` and the team sees who they're
talking to without asking; otherwise **Ask who's asking** in `/app/assistant`
collects it before the first message.

**Locking it to your site.** Settings → *Websites allowed to embed the
assistant* takes one origin per line. Once set, `/w/[slug]` is served with a
`frame-ancestors` policy for those origins (see `proxy.ts`) and the chat API
rejects requests from anywhere else. Empty means embeddable anywhere, which is
the right default while evaluating. Each visitor is also limited to 30 messages
a minute per workspace.

---

## Platform admin

A user flagged `isSuperAdmin` sees **Platform → Admin** in the sidebar and gets
`/admin`: every workspace with its owner, who's online right now, conversation
and article counts and the pending queue. From there they can create a
workspace for a customer (with its first owner), suspend one — the public
assistant and chat API answer 503 and the dashboard shows a banner until it's
reactivated — enter it as an owner to help with setup, or delete it. Super
admin is a platform flag, not a workspace role: it grants nothing inside a
workspace until they enter it.

## Visitors and the team

- **Who's asking.** Conversations carry a visitor name and email when the host
  site passes them or the pre-chat form collects them; the inbox and the queue
  show them.
- **Picking up where they left off.** The widget remembers its conversation per
  workspace in the browser, so a refresh — or a return visit mid hand-off —
  lands back in the same thread.
- **Presence.** The dashboard heartbeats every minute. The widget header says
  when the team is online, and the hand-off banner is honest when nobody is.
- **Claiming.** Anyone on the team can claim a pending escalation so the rest of
  the queue sees who has it. **Mine** filters to yours; a claim can be released
  or taken over.

---

## Roles

| Role | Can |
| --- | --- |
| **Owner** | Everything, including deleting the workspace |
| **Admin** | Manage the assistant, knowledge base and teammates |
| **Agent** | Answer escalations and reply in the inbox; read-only knowledge base |
| **Platform admin** | Everything above in any workspace they enter, plus creating, suspending and deleting workspaces |

A workspace always keeps at least one owner — the last one can't be demoted or
removed.

---

## Deploy

The app is one long-running Node process plus Postgres. It needs a host that
keeps a process alive (live updates and rate limiting are in-memory), so a
serverless platform isn't a fit without changes. The free path:

**1. Database — [Neon](https://neon.tech)** (free tier). Create a project and
copy the *direct* connection string (not the `-pooler` one), adding
`?sslmode=require`.

**2. App — [Render](https://render.com)** (free web service). Push this repo to
GitHub, then in Render choose **New → Blueprint** and pick the repo;
`render.yaml` fills in the build (`npm ci && npx prisma db push --skip-generate
&& npm run build`), the start command, the health check and the environment
variables. It will prompt for:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Neon string from step 1 |
| `SUPER_ADMIN_EMAIL` | your email — the account that signs up with it becomes the platform admin |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | optional; leave blank to run on the built-in engine |

The first deploy pushes the schema to the empty database. Sign up at
`/signup` with the super-admin email, and `/admin` appears. Don't run the demo
seed against production.

**3. Keep it awake.** A free Render instance sleeps after 15 idle minutes and
takes ~30s to wake, which a visitor opening the widget would feel. Point a free
uptime pinger (UptimeRobot, cron-job.org) at `https://<your-app>/api/health`
every 10 minutes; the health check also wakes Neon's compute.

Any Node host works the same way: set `DATABASE_URL`, run `npx prisma db push`
once, `npm run build`, `npm start`. HTTPS is required for voice — browsers
only grant the microphone on secure origins.

---

## Scripts

| | |
| --- | --- |
| `npm run db:up` / `db:down` | Start / stop the Postgres container |
| `npm run dev` | Setup if needed, then the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:reset` | Wipe all data and reseed the demo workspace |
| `npm run db:studio` | Prisma Studio |
| `npm run make-super-admin -- you@company.com` | Flag an existing account as platform super admin |
| `npm run typecheck` | `tsc --noEmit` |

---

## Not in this build

Deliberately out of scope for the MVP:

- **Billing.** No plans, metering or payment. Roles and workspace limits are the
  hooks it would attach to.
- **Invite emails.** Adding a teammate sets their starting password directly
  rather than sending a link. Memberships, roles and permissions are real.
- **Password reset.** No mail transport is configured.
- **Embeddings.** Retrieval is lexical. `lib/ai/retrieval.ts` is the seam — it
  behaves well into the low thousands of articles per workspace.

## Structure

```
app/
  (app)/            authenticated, org-scoped app
    admin/          platform console (super admin)
  (auth)/           login and signup
  api/              route handlers
  w/[slug]/         public assistant
proxy.ts            per-tenant frame-ancestors policy for /w/[slug]
components/
  app/              app chrome and feature UI
  widget/           customer-facing chat
  ui/               Radix-based primitives
lib/
  ai/               retrieval, providers, escalation decision
  auth/             password hashing, sessions, guards
  db.ts             Prisma client
  escalations.ts    SLA sweep
  events.ts         in-process pub/sub for SSE
prisma/
  schema.prisma     multi-tenant schema
  seed.mjs          demo workspace
docker-compose.yml  local Postgres
```
