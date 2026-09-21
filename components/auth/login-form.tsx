"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO = { email: "demo@example.com", password: "demo1234" };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (credentials: { email: string; password: string }) => {
    setBusy(true);
    setErrors({});

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrors(payload.errors ?? { form: "Something went wrong" });
      setBusy(false);
      return;
    }

    // Refresh so the server layout picks up the new session cookie.
    router.push("/app");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit({ email, password });
        }}
        className="space-y-4"
      >
        {errors.form && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/6 p-3 text-[12.5px] text-destructive">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            placeholder="you@company.com"
          />
          {errors.email && (
            <p className="text-[12px] text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="text-[12px] text-destructive">{errors.password}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            or
          </span>
        </div>
      </div>

      {/* The seeded workspace, one click away — nobody should have to type
          credentials to look around a demo. */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setEmail(DEMO.email);
          setPassword(DEMO.password);
          submit(DEMO);
        }}
      >
        Explore the demo workspace
      </Button>
    </div>
  );
}
