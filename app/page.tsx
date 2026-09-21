import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Gauge,
  KeyRound,
  Link2,
  Lock,
  MessageSquare,
  Mic,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export default async function LandingPage() {
  const [session, headerList, demo] = await Promise.all([
    getSession(),
    headers(),
    // The demo workspace ships with the seed; a fresh deployment won't have it.
    db.organization.findUnique({
      where: { slug: "northwind" },
      select: { suspended: true },
    }),
  ]);

  const primaryHref = session ? "/app" : "/signup";
  const primaryLabel = session ? "Open your workspace" : "Create your workspace";
  const demoHref = demo && !demo.suspended ? "/w/northwind" : null;

  // Show the snippet with this deployment's real address, so what people
  // read here is exactly what they'll paste.
  const host = headerList.get("host") ?? "your-host";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const navLinks = [
    { href: "#how", label: "How it works" },
    { href: "#install", label: "Install" },
    { href: "#features", label: "Features" },
    { href: "#faq", label: "FAQ" },
    ...(demoHref ? [{ href: demoHref, label: "Live demo" }] : []),
  ];

  return (
    <div className="min-h-svh bg-background">
      {/* ------------------------------------------------------------------
          Hero. A sky, a horizon, one plain sentence in serif that says what
          this is and how little it takes to install. The copy rises in one
          line after another; the glow behind it drifts so the sky breathes.
          ------------------------------------------------------------------ */}
      <section className="sky relative isolate overflow-hidden text-white">
        <header className="shell relative z-10 flex h-16 items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-white/95 text-[11px] font-bold text-primary">
              H
            </span>
            Helpdesk AI
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13.5px] font-medium text-white/80 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/30 bg-white/15 text-white hover:bg-white/25"
              >
                <Link href="/app">Open workspace</Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-2 text-[13.5px] font-medium text-white/85 transition-colors hover:text-white"
                >
                  Sign in
                </Link>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-white/30 bg-white/15 text-white hover:bg-white/25"
                >
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </header>

        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute left-1/2 top-28 -z-10 h-72 w-[44rem] max-w-[120vw] -translate-x-1/2 rounded-full bg-white/12 blur-3xl"
        />

        <div className="shell relative z-10 pt-16 pb-44 text-center sm:pt-24 sm:pb-56">
          <p className="animate-rise mx-auto inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-[12px] font-medium text-white/95 backdrop-blur-sm">
            <span>Chat + voice</span>
            <span className="size-1 rounded-full bg-white/70" />
            <span>One line to install</span>
            <span className="size-1 rounded-full bg-white/70" />
            <span>No API key needed</span>
          </p>

          <h1 className="display animate-rise [animation-delay:80ms] mx-auto mt-7 max-w-[14ch] text-[42px] sm:max-w-4xl sm:text-[66px] lg:text-[82px]">
            AI support for your website. One line to install.
          </h1>

          <p className="animate-rise [animation-delay:160ms] mx-auto mt-7 max-w-2xl text-[17px] font-medium leading-snug tracking-[-0.02em] text-white [text-shadow:0_1px_14px_oklch(0.35_0.1_250/0.45)] sm:text-[19px]">
            Paste a single script tag and your visitors can ask questions by
            chat or voice. The assistant answers from your own help content —
            and when it isn't sure, a real person from your team takes over,
            right in the same window.
          </p>

          <div className="animate-rise [animation-delay:240ms] mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 text-[15px]">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {/* Solid white, not frosted: the buttons sit on the pale haze, where
                a translucent white pill all but disappears. */}
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 rounded-xl bg-white px-6 text-[15px] text-primary shadow-[0_1px_2px_oklch(0_0_0/0.1),0_6px_18px_oklch(0.4_0.1_250/0.2)] hover:bg-white/90"
            >
              <Link href={demoHref ?? "#install"}>
                {demoHref ? "Try the live assistant" : "See how to install it"}
              </Link>
            </Button>
          </div>
        </div>

        {/* The horizon: layered ridgelines in the sky's own blue, drawn here
            rather than shipped as an image so they scale and recolour with
            the theme. */}
        <svg
          aria-hidden
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-primary sm:h-56"
        >
          <path
            fill="currentColor"
            fillOpacity="0.18"
            d="M0 200 L120 150 L230 185 L330 120 L420 170 L540 95 L640 160 L760 110 L860 165 L980 105 L1090 160 L1200 120 L1320 175 L1440 130 L1440 240 L0 240 Z"
          />
          <path
            fill="currentColor"
            fillOpacity="0.32"
            d="M0 225 L160 180 L260 205 L380 150 L470 195 L600 135 L700 190 L830 145 L940 195 L1060 140 L1170 190 L1290 155 L1440 200 L1440 240 L0 240 Z"
          />
          <path
            fill="currentColor"
            fillOpacity="0.5"
            d="M0 240 L110 215 L240 228 L360 200 L480 226 L610 195 L720 224 L860 200 L980 228 L1100 205 L1220 226 L1340 208 L1440 224 L1440 240 Z"
          />
        </svg>
      </section>

      {/* ------------------------------------------------------------------
          Product glimpse, lifted over the horizon like a window in front of
          a landscape. One conversation plays out in real time and tells the
          whole story: an answer the assistant is sure of, one it isn't, and
          the teammate who steps in.
          ------------------------------------------------------------------ */}
      <section className="shell relative z-20 -mt-28 sm:-mt-40">
        <div className="animate-rise [animation-delay:360ms] glass-panel mx-auto max-w-3xl overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/50 px-4 py-3 dark:border-white/10">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
              N
            </span>
            <span className="text-[12.5px] font-medium">Northwind Supply</span>
            <span className="ml-3 hidden items-center gap-1 rounded-full border border-border bg-background/60 p-0.5 text-[11px] sm:flex">
              <span className="flex items-center gap-1 rounded-full bg-card px-2 py-0.5 font-medium shadow-sm">
                <MessageSquare className="size-3" /> Chat
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 text-muted-foreground">
                <Mic className="size-3" /> Voice
              </span>
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="pulse-dot size-1.5 rounded-full bg-emerald-500" />
              Aria and the team are online
            </span>
          </div>

          <div className="space-y-4 p-5">
            <Exchange
              question="Do you ship to Canada?"
              answer="Yes — Canadian orders take 5–8 business days, and duties are included at checkout so there's nothing to pay on delivery."
              confidence={94}
              source="Shipping & delivery"
              delay={400}
            />
            <Exchange
              question="My invoice shows $240 but my plan is $99 — what's the extra charge?"
              answer="I want to get this right, so I've passed it to a teammate. They'll reply here shortly."
              confidence={23}
              escalated
              delay={2100}
            />
            <div
              className="animate-pop flex gap-2.5"
              style={{ animationDelay: "4000ms" }}
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-semibold text-white">
                SC
              </span>
              <div className="min-w-0 max-w-[84%] space-y-1.5">
                <p className="rounded-2xl rounded-tl-md border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-[13px] leading-relaxed">
                  Hi, Sam from Northwind here. The extra $141 is a prorated
                  upgrade from March 12 — I'm sending you an itemised copy now.
                </p>
                <p className="px-1 text-[11px] text-muted-foreground">
                  Sam Chen · Support team · replied from the dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          How it works. Three concrete steps a business owner can picture.
          ------------------------------------------------------------------ */}
      <section id="how" className="scroll-mt-16 py-24">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">
              Three steps. No engineering project.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              You bring your help content and your website. Everything else —
              the assistant, the widget, the team dashboard — is already built.
            </p>
          </Reveal>

          <Reveal
            as="ol"
            stagger
            className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-3"
          >
            {[
              {
                step: "01",
                icon: BookOpen,
                title: "Add what you already know",
                body: "Paste in your FAQs, policies and product docs. That's the knowledge base — the only thing the assistant answers from, so it can't invent a refund policy you don't have.",
              },
              {
                step: "02",
                icon: Code2,
                title: "Paste one line into your site",
                body: "Copy the snippet from your Install page and drop it before </body>. A launcher appears in the corner of every page — chat and voice, no redesign, no app to install.",
              },
              {
                step: "03",
                icon: Users,
                title: "Your team picks up the rest",
                body: "Anything the assistant can't answer confidently lands in your team's queue. They reply from the dashboard and the visitor sees it in the same conversation — chat stays chat, a call stays a call.",
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <li
                key={step}
                className="hover-lift rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-sunken">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <span className="tabular text-[11px] font-medium tracking-[0.06em] text-muted-foreground">
                    {step}
                  </span>
                </div>
                <h3 className="mt-3.5 text-[15px] font-semibold tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </Reveal>

          <Reveal className="mx-auto mt-6 max-w-5xl rounded-2xl border border-border bg-surface-sunken p-5">
            <div className="flex items-start gap-3">
              <Gauge className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  How it decides.
                </span>{" "}
                Every answer is scored before it's sent. Above your threshold
                the assistant replies. Below it, it suggests the closest
                articles first — and only if the visitor still isn't helped
                does it bring in a person. Each answer your team gives is saved
                back to the knowledge base, so the same question never reaches
                a human twice.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Install. The exact snippet, which sites it works on, and what the
          optional attributes do. On the soft sky so the glass has something
          to blur.
          ------------------------------------------------------------------ */}
      <section id="install" className="sky-soft scroll-mt-16 border-t border-border">
        <div className="shell py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <Reveal>
              <p className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">
                Install
              </p>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">
                Works on any website
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                The snippet is one script tag. Put it before the closing{" "}
                <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[12.5px]">
                  &lt;/body&gt;
                </code>{" "}
                tag — or in your platform's “custom code” box — and a launcher
                appears in the corner of every page.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  {
                    title: "Plain HTML or a custom-built site",
                    body: "Paste it into your layout or footer include.",
                  },
                  {
                    title: "WordPress, Shopify, Webflow, Wix, Squarespace",
                    body: "Anywhere with a header/footer code or “custom code” setting — no plugin needed.",
                  },
                  {
                    title: "React, Next.js, Vue, Angular",
                    body: "A script tag in your root layout. Nothing else to import.",
                  },
                  {
                    title: "No website changes at all",
                    body: "Every workspace also has its own link. Put it behind a “Help” button, in an email signature, or on a QR code.",
                  },
                ].map(({ title, body }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="size-3" />
                    </span>
                    <div>
                      <p className="text-[14px] font-medium">{title}</p>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={120} className="space-y-4">
              <div className="glass-panel overflow-hidden rounded-2xl">
                <div className="flex items-center gap-2 border-b border-white/50 px-4 py-2.5 text-[12px] text-muted-foreground dark:border-white/10">
                  <Code2 className="size-3.5" />
                  Paste before <span className="font-mono">&lt;/body&gt;</span>
                </div>
                <pre className="overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-relaxed">
                  <code>
                    <span className="text-muted-foreground">&lt;</span>
                    <span className="text-primary">script</span>
                    {"\n  "}
                    <span className="text-foreground/70">src</span>=
                    <span className="text-emerald-700 dark:text-emerald-400">
                      "{origin}/embed.js"
                    </span>
                    {"\n  "}
                    <span className="text-foreground/70">data-workspace</span>=
                    <span className="text-emerald-700 dark:text-emerald-400">
                      "your-workspace"
                    </span>
                    {"\n  "}
                    <span className="text-foreground/70">defer</span>
                    {"\n"}
                    <span className="text-muted-foreground">&gt;&lt;/</span>
                    <span className="text-primary">script</span>
                    <span className="text-muted-foreground">&gt;</span>
                  </code>
                </pre>
              </div>

              <div className="glass-panel divide-y divide-white/50 rounded-2xl dark:divide-white/10">
                {[
                  {
                    icon: UserRound,
                    code: "data-name · data-email",
                    body: "If your users are signed in, pass who they are and your team sees it — no form for the visitor to fill in.",
                  },
                  {
                    icon: Link2,
                    code: "data-position · data-accent",
                    body: "Left or right corner, and a launcher colour to match your brand.",
                  },
                  {
                    icon: Lock,
                    code: "Allowed websites",
                    body: "List your domains in Settings and no other site can embed your assistant.",
                  },
                ].map(({ icon: Icon, code, body }) => (
                  <div key={code} className="flex items-start gap-3 px-5 py-3.5">
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] font-medium">{code}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Features, split by who benefits: the visitor on the site, and the
          team behind it.
          ------------------------------------------------------------------ */}
      <section id="features" className="scroll-mt-16 border-t border-border py-24">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">
              Features
            </p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">
              Good for the people asking. Built for the people answering.
            </h2>
          </Reveal>

          <Reveal stagger className="mx-auto mt-12 grid max-w-5xl gap-4 lg:grid-cols-2">
            <FeatureColumn
              icon={MessageSquare}
              eyebrow="Your visitors get"
              title="Answers now, a person when it matters"
              items={[
                {
                  title: "Instant answers from your own content",
                  body: "Grounded in your knowledge base, with the article it came from — not the open internet.",
                },
                {
                  title: "Chat or hands-free voice",
                  body: "They can type, or talk and hear the assistant answer back. Browser-native, no phone system.",
                },
                {
                  title: "A real human without leaving the page",
                  body: "When the assistant steps aside, your teammate's replies arrive in the same window. A voice conversation continues as a live call.",
                },
                {
                  title: "Pick up where they left off",
                  body: "Close the tab, come back tomorrow — the conversation is still there.",
                },
              ]}
            />
            <FeatureColumn
              icon={Users}
              eyebrow="Your team gets"
              title="One queue, and an assistant that learns"
              items={[
                {
                  title: "A queue with a countdown",
                  body: "Each hand-off shows the visitor, the transcript, what the assistant wanted to say, and how long you've got. Claim one so nobody doubles up.",
                },
                {
                  title: "Answer once, teach it forever",
                  body: "Your reply goes to the visitor and, with one checkbox, into the knowledge base.",
                },
                {
                  title: "Every conversation, with the confidence behind it",
                  body: "The inbox shows what was said and how sure the assistant was. Jump in and take over any time.",
                },
                {
                  title: "Staff, roles and knowledge in one place",
                  body: "Owners, admins and agents. Add teammates, edit articles, set the threshold, see who's online.",
                },
              ]}
            />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Trust. Why it's safe to put in front of customers.
          ------------------------------------------------------------------ */}
      <section className="border-t border-border bg-surface-sunken py-24">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">
              Safe to put in front of customers
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              The failure mode of most chatbots is confident nonsense. This one
              is designed to say “let me get a person” instead.
            </p>
          </Reveal>

          <Reveal
            stagger
            className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                icon: Gauge,
                title: "It knows when it doesn't know",
                body: "Every answer is scored. Below your threshold it never guesses — it recommends, then hands off.",
              },
              {
                icon: BookOpen,
                title: "Only your content",
                body: "Answers come from the knowledge base you control. Nothing is made up from the wider web.",
              },
              {
                icon: ShieldCheck,
                title: "Your data stays yours",
                body: "Each workspace is isolated end to end, and only the domains you list can embed your assistant.",
              },
              {
                icon: KeyRound,
                title: "No API key required",
                body: "The built-in engine works out of the box. Add an Anthropic or OpenAI key when you want a model to phrase replies.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="hover-lift rounded-2xl border border-border bg-card p-5 hover:border-border-strong"
              >
                <Icon className="size-4 text-primary" />
                <h3 className="mt-3 text-[14.5px] font-semibold tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t border-border py-24">
        <div className="shell">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <h2 className="text-center text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">
                Questions people ask first
              </h2>
            </Reveal>

            <Reveal stagger className="mt-10 space-y-3">
              {[
                {
                  q: "Do I need an OpenAI or Anthropic key?",
                  a: "No. The built-in engine answers from your knowledge base with no key at all. If you'd like a language model to phrase the replies more naturally, add your own Anthropic or OpenAI key under Assistant → Engine — per workspace, whenever you're ready.",
                },
                {
                  q: "Will it work on my website?",
                  a: "If you can add a line of code to your pages, yes: plain HTML, WordPress, Shopify, Webflow, Wix, Squarespace, React, Next.js and so on. If you can't touch the code, share your workspace's link instead — it's the same assistant on its own page.",
                },
                {
                  q: "What happens when the assistant doesn't know the answer?",
                  a: "It says so. First it suggests the closest articles it does have. If the visitor still isn't helped, it hands the conversation to your team with a note of what it wanted to say and why it held back. The visitor keeps the same window and sees your teammate's reply there.",
                },
                {
                  q: "Can visitors talk to a real person?",
                  a: "Yes — they can ask for one at any time, and the assistant will also bring one in on its own when it isn't confident. Chat hands off as chat; a voice conversation hands off as a live call your teammate joins from the dashboard.",
                },
                {
                  q: "How does voice work? Do I need a phone system?",
                  a: "No phone system. Voice runs in the visitor's browser: they speak, the assistant listens and talks back. It needs a modern browser and HTTPS, both of which you have if your site is live.",
                },
                {
                  q: "Can another website embed my assistant?",
                  a: "Not once you list your domains under Settings → Websites allowed to embed. After that, the assistant refuses to load or answer anywhere else.",
                },
                {
                  q: "How long does setup take?",
                  a: "Creating a workspace takes a minute. Most teams paste in their existing FAQ and policies, drop the snippet on their site and are live the same afternoon.",
                },
              ].map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-border bg-card px-5 py-4 transition-colors duration-200 open:border-border-strong"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="details-body mt-3 text-[14px] leading-relaxed text-muted-foreground">
                    {a}
                  </p>
                </details>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Closing call to action on a periwinkle field, with the two-tone
          headline: the claim in ink, the invitation in a quieter shade.
          ------------------------------------------------------------------ */}
      <section className="periwinkle-field border-t border-border">
        <div className="shell py-24">
          <Reveal className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
                Your visitors have questions right now.
                <br />
                <span className="text-foreground/55">
                  Answer them with one line of code.
                </span>
              </h2>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="ink h-12 rounded-xl px-6 text-[15px] hover:opacity-90"
                >
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                {demoHref && (
                  <Link
                    href={demoHref}
                    className="px-2 text-[14px] font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Try the live assistant
                  </Link>
                )}
              </div>
            </div>

            <ThemeToggle />
          </Reveal>

          <footer className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-border-strong/40 pt-6 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center">
            <p>Helpdesk AI — an AI support agent for any website, with your team behind it.</p>
            <div className="flex items-center gap-5">
              {demoHref && (
                <Link
                  href={demoHref}
                  className="transition-colors hover:text-foreground"
                >
                  Live demo
                </Link>
              )}
              <Link href="/login" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link href="/signup" className="transition-colors hover:text-foreground">
                Create a workspace
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

function FeatureColumn({
  icon: Icon,
  eyebrow,
  title,
  items,
}: {
  icon: typeof MessageSquare;
  eyebrow: string;
  title: string;
  items: { title: string; body: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-sunken">
          <Icon className="size-4 text-primary" />
        </span>
        <span className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">
        {title}
      </h3>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Check className="size-3" />
            </span>
            <div>
              <p className="text-[14px] font-medium">{item.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One question-and-answer pair in the hero demo, played out in time: the
 * question lands, the assistant "types" for a moment, then the reply takes
 * the typing indicator's place. Both share a grid cell so nothing shifts.
 */
function Exchange({
  question,
  answer,
  confidence,
  source,
  escalated = false,
  delay = 0,
}: {
  question: string;
  answer: string;
  confidence: number;
  source?: string;
  escalated?: boolean;
  /** When the question appears, in ms from page load. */
  delay?: number;
}) {
  const typingDelay = delay + 350;
  const answerDelay = typingDelay + 900;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <p
          className="animate-pop max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2 text-[13px] leading-relaxed text-primary-foreground"
          style={{ animationDelay: `${delay}ms` }}
        >
          {question}
        </p>
      </div>
      <div className="flex gap-2.5">
        <span
          className="animate-pop mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary"
          style={{ animationDelay: `${typingDelay}ms` }}
        >
          AI
        </span>
        <div className="grid min-w-0 max-w-[84%]">
          <div
            aria-hidden
            className="animate-typing flex items-start [grid-area:1/1]"
            style={{ animationDelay: `${typingDelay}ms` }}
          >
            <span className="flex gap-1 rounded-2xl rounded-tl-md bg-surface-sunken px-3.5 py-3">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
              ))}
            </span>
          </div>
          <div
            className="animate-pop space-y-1.5 [grid-area:1/1]"
            style={{ animationDelay: `${answerDelay}ms` }}
          >
            <p className="rounded-2xl rounded-tl-md bg-surface-sunken px-3.5 py-2 text-[13px] leading-relaxed">
              {answer}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
              <span className="h-1 w-14 overflow-hidden rounded-full bg-border">
                <span
                  className={`block h-full rounded-full ${
                    escalated ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(3, confidence)}%` }}
                />
              </span>
              <span
                className={`tabular text-[11px] font-medium ${
                  escalated
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {confidence}%
              </span>
              <span className="text-[11px] text-muted-foreground">
                {escalated
                  ? "· held back — sent to your team"
                  : source
                    ? `· answered from “${source}”`
                    : "· answered"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
