"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrors(payload.errors ?? { form: "Something went wrong" });
      setBusy(false);
      return;
    }

    router.push("/app");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {errors.form && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/6 p-3 text-[12.5px] text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <Field
        id="orgName"
        label="Workspace name"
        placeholder="Northwind Supply"
        value={form.orgName}
        onChange={update("orgName")}
        error={errors.orgName}
        autoFocus
      />

      <Field
        id="name"
        label="Your name"
        placeholder="Alex Morgan"
        value={form.name}
        onChange={update("name")}
        error={errors.name}
        autoComplete="name"
      />

      <Field
        id="email"
        label="Work email"
        type="email"
        placeholder="you@company.com"
        value={form.email}
        onChange={update("email")}
        error={errors.email}
        autoComplete="email"
      />

      <Field
        id="password"
        label="Password"
        type="password"
        placeholder="At least 8 characters"
        value={form.password}
        onChange={update("password")}
        error={errors.password}
        autoComplete="new-password"
      />

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Create workspace
      </Button>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        Your assistant starts working immediately — no API key needed.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  ...props
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
} & Omit<React.ComponentProps<"input">, "onChange" | "value" | "type" | "id">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
