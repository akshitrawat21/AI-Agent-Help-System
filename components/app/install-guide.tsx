"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_ACCENT = "#3d7bf7";

/**
 * Everything a client needs to put the assistant on their own site: the
 * snippet, the options that change it, and a live preview so they can see
 * exactly what their visitors will.
 */
export function InstallGuide({ slug, orgName }: { slug: string; orgName: string }) {
  const [position, setPosition] = useState<"right" | "left">("right");
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [copied, setCopied] = useState<string | null>(null);

  // The origin is only knowable in the browser; render a placeholder until
  // mount so server and client emit the same markup.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const host = origin || "https://your-host";

  const attributes = [
    `src="${host}/embed.js"`,
    `data-workspace="${slug}"`,
    position !== "right" ? `data-position="${position}"` : null,
    accent.toLowerCase() !== DEFAULT_ACCENT ? `data-accent="${accent}"` : null,
    "defer",
  ].filter(Boolean);

  const snippet = `<script\n  ${attributes.join("\n  ")}\n></script>`;
  const publicUrl = `${host}/w/${slug}`;

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>1. Paste one line into your site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Add this before the closing <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11.5px]">&lt;/body&gt;</code>{" "}
              tag on any page. It adds a launcher button in the corner that
              opens {orgName}'s assistant — chat and voice — without leaving
              the page.
            </p>

            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface-sunken p-4 font-mono text-[12px] leading-relaxed">
                {snippet}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2.5 right-2.5"
                onClick={() => copy(snippet, "snippet")}
              >
                {copied === "snippet" ? (
                  <Check className="size-3.5 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied === "snippet" ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Launcher position</Label>
                <div className="inline-flex w-full items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5">
                  {(["right", "left"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPosition(option)}
                      aria-pressed={position === option}
                      className={cn(
                        "flex-1 rounded-[6px] px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors",
                        position === option
                          ? "bg-surface text-foreground shadow-[0_1px_2px_oklch(0_0_0/0.06)]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Bottom {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accent">Launcher colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="accent"
                    type="color"
                    value={accent}
                    onChange={(event) => setAccent(event.target.value)}
                    className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
                    aria-label="Launcher colour"
                  />
                  <Input
                    value={accent}
                    onChange={(event) => setAccent(event.target.value)}
                    className="font-mono"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Or link to it directly</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              No code needed — put this behind a "Help" or "Contact" link, in
              an email signature, or on a QR code at the counter.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface-sunken px-3 py-2 font-mono text-[12px]">
                {publicUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copy(publicUrl, "url")}
                aria-label="Copy link"
              >
                {copied === "url" ? (
                  <Check className="size-3.5 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={`/w/${slug}`} target="_blank" rel="noreferrer" aria-label="Open assistant">
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What your visitors get</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="font-medium text-foreground">Chat and voice.</span>{" "}
                  They can type or talk; the assistant answers from your
                  knowledge base and speaks back.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="font-medium text-foreground">A person when it matters.</span>{" "}
                  Anything the assistant isn't sure of lands in your team's
                  queue here, and the visitor keeps the conversation going with
                  a real teammate — in the same window.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="font-medium text-foreground">Nothing to host.</span>{" "}
                  The launcher loads from here; your site only carries the one
                  script tag.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Live preview: the real widget in a frame the size of the launcher
          panel, so what they see here is what a visitor sees. */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Live preview
        </p>
        <div className="overflow-hidden rounded-2xl border border-border shadow-[0_2px_6px_oklch(0_0_0/0.06),0_20px_48px_oklch(0.4_0.08_260/0.14)]">
          <iframe
            title={`${orgName} assistant preview`}
            src={`/w/${slug}`}
            className="block h-[560px] w-full bg-background"
            allow="microphone"
          />
        </div>
        <div className={cn("mt-3 flex", position === "left" ? "justify-start" : "justify-end")}>
          <span
            className="flex size-11 items-center justify-center rounded-full text-white shadow-[0_4px_16px_oklch(0_0_0/0.18)]"
            style={{ background: accent }}
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
        </div>
        <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
          The launcher, as it will appear on your site.
        </p>
      </div>
    </div>
  );
}
