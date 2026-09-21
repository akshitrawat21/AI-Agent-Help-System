"use client";

import { useState } from "react";
import { Check, Key, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PROVIDERS, TONES } from "@/lib/constants";
import { percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AgentConfigView = {
  agentName: string;
  greeting: string;
  persona: string;
  tone: string;
  confidenceThreshold: number;
  escalationTimeout: number;
  autoLearn: boolean;
  voiceEnabled: boolean;
  collectVisitorDetails: boolean;
  provider: string;
  model: string;
  hasApiKey: boolean;
};

export function AssistantSettings({
  initial,
  canEdit,
}: {
  initial: AgentConfigView;
  canEdit: boolean;
}) {
  const [config, setConfig] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof AgentConfigView>(
    key: K,
    value: AgentConfigView[K]
  ) => setConfig((current) => ({ ...current, [key]: value }));

  const provider =
    PROVIDERS.find((option) => option.id === config.provider) ?? PROVIDERS[0];

  const save = async () => {
    setBusy(true);
    setErrors({});

    const { hasApiKey, ...payload } = config;

    const response = await fetch("/api/agent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        // Only send the key when the field was actually filled in, so saving
        // other settings never wipes a stored key.
        ...(apiKey ? { apiKey } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setErrors(body.errors ?? { form: body.error ?? "Couldn't save" });
      setBusy(false);
      return;
    }

    const body = await response.json();
    setConfig({ ...body.config, hasApiKey: body.config.hasApiKey });
    setApiKey("");
    setBusy(false);
    toast.success("Assistant updated");
  };

  const clearKey = async () => {
    setBusy(true);
    const response = await fetch("/api/agent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "", provider: "local" }),
    });

    if (!response.ok) {
      setBusy(false);
      toast.error("Couldn't remove the key");
      return;
    }

    const body = await response.json();
    setConfig({ ...body.config, hasApiKey: false });
    setBusy(false);
    toast.success("Key removed — back to the built-in engine");
  };

  return (
    <div className="space-y-4">
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/6 p-3 text-[12.5px] text-destructive">
          {errors.form ? (
            errors.form
          ) : (
            <>
              <p className="font-medium">Some settings couldn't be saved:</p>
              <ul className="mt-1 list-inside list-disc">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="agentName">Name</Label>
              <Input
                id="agentName"
                value={config.agentName}
                onChange={(event) => set("agentName", event.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={config.tone}
                onValueChange={(value) => set("tone", value)}
                disabled={!canEdit}
              >
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((option) => (
                    <SelectItem key={option} value={option} className="capitalize">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="greeting">Opening message</Label>
            <Input
              id="greeting"
              value={config.greeting}
              onChange={(event) => set("greeting", event.target.value)}
              disabled={!canEdit}
            />
            <p className="text-[11.5px] text-muted-foreground">
              The first thing every visitor sees.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="persona">Instructions</Label>
            <Textarea
              id="persona"
              value={config.persona}
              onChange={(event) => set("persona", event.target.value)}
              className="min-h-24"
              disabled={!canEdit}
            />
            <p className="text-[11.5px] text-muted-foreground">
              Used when a hosted model writes the replies. The built-in engine
              returns your knowledge base answers verbatim.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When to bring in a human</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label>Confidence threshold</Label>
              <span className="tabular text-[13px] font-semibold">
                {percent(config.confidenceThreshold)}
              </span>
            </div>
            <Slider
              value={[config.confidenceThreshold * 100]}
              onValueChange={([value]) =>
                set("confidenceThreshold", value / 100)
              }
              min={10}
              max={95}
              step={5}
              disabled={!canEdit}
            />
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Answers scoring below this are held back and sent to your team
              instead. Higher means more escalations and fewer wrong answers.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timeout">Response window</Label>
            <div className="flex items-center gap-2">
              <Input
                id="timeout"
                type="number"
                min={1}
                max={1440}
                value={config.escalationTimeout}
                onChange={(event) =>
                  set("escalationTimeout", Number(event.target.value))
                }
                className="w-24"
                disabled={!canEdit}
              />
              <span className="text-[13px] text-muted-foreground">minutes</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Escalations nobody answers in this window are marked missed.
            </p>
          </div>

          <Toggle
            label="Learn from your team's answers"
            description="When a teammate answers an escalation, save it to the knowledge base automatically."
            checked={config.autoLearn}
            onChange={(value) => set("autoLearn", value)}
            disabled={!canEdit}
          />

          <Toggle
            label="Voice conversations"
            description="Let visitors talk to the assistant and hear its answers read aloud, hands-free. Uses the browser's own speech engine — no key, and no audio leaves their device."
            checked={config.voiceEnabled}
            onChange={(value) => set("voiceEnabled", value)}
            disabled={!canEdit}
          />

          <Toggle
            label="Ask who's asking"
            description="Before the first message, ask visitors for a name and email so your team knows who they're helping. Skipped automatically when your website already passes that in."
            checked={config.collectVisitorDetails}
            onChange={(value) => set("collectVisitorDetails", value)}
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {PROVIDERS.map((option) => {
              const active = config.provider === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    set("provider", option.id);
                    set("model", option.models[0]);
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all duration-150",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-surface hover:border-border-strong",
                    !canEdit && "cursor-not-allowed opacity-60"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium">{option.name}</span>
                    {active && <Check className="size-3.5 text-primary" />}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          {config.provider === "local" ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-sunken p-3">
              <Sparkles className="mt-px size-3.5 shrink-0 text-primary" />
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                No key needed. The assistant retrieves the best matching answer
                from your knowledge base and escalates whatever it can't ground
                in an article. Everything works — replies are just verbatim
                rather than rephrased.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <Select
                  value={config.model}
                  onValueChange={(value) => set("model", value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {provider.models.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apiKey">API key</Label>
                {config.hasApiKey ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2">
                    <Lock className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="flex-1 text-[12.5px] text-muted-foreground">
                      A key is stored for this workspace.
                    </span>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearKey}
                        disabled={busy}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ) : null}

                <div className="relative">
                  <Key className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={
                      config.hasApiKey
                        ? "Enter a new key to replace it"
                        : config.provider === "anthropic"
                          ? "sk-ant-..."
                          : "sk-..."
                    }
                    className="pl-8.5"
                    disabled={!canEdit}
                    autoComplete="off"
                  />
                </div>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  Stored per workspace and never sent back to the browser. Leave
                  it empty to fall back to the{" "}
                  <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">
                    {config.provider === "anthropic"
                      ? "ANTHROPIC_API_KEY"
                      : "OPENAI_API_KEY"}
                  </code>{" "}
                  environment variable.
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-sunken p-3">
                <Badge variant="outline" className="mt-px shrink-0">
                  Safe
                </Badge>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  If the provider is unreachable or the key is rejected, the
                  assistant falls back to the built-in engine instead of failing
                  the conversation.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy} size="lg">
            {busy && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        <p className="max-w-md text-[11.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
