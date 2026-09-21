"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function WorkspaceSettings({
  org,
  isOwner,
  canEdit,
}: {
  org: { id: string; name: string; slug: string; allowedOrigins: string };
  isOwner: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [allowedOrigins, setAllowedOrigins] = useState(org.allowedOrigins);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty =
    name !== org.name ||
    slug !== org.slug ||
    allowedOrigins !== org.allowedOrigins;

  const save = async () => {
    setBusy(true);
    setErrors({});

    const response = await fetch("/api/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, allowedOrigins }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrors(payload.errors ?? { form: payload.error ?? "Couldn't save" });
      setBusy(false);
      return;
    }

    setBusy(false);
    toast.success("Workspace updated");
    router.refresh();
  };

  const destroy = async () => {
    setBusy(true);
    const response = await fetch("/api/org", { method: "DELETE" });

    if (!response.ok) {
      toast.error("Couldn't delete the workspace");
      setBusy(false);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.form && (
              <p className="text-[12.5px] text-destructive">{errors.form}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!canEdit}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p className="text-[12px] text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Public address</Label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[12.5px] text-muted-foreground">
                  /w/
                </span>
                <Input
                  id="org-slug"
                  value={slug}
                  onChange={(event) =>
                    setSlug(
                      event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                    )
                  }
                  disabled={!canEdit}
                  aria-invalid={Boolean(errors.slug)}
                  className="font-mono"
                />
              </div>
              {errors.slug && (
                <p className="text-[12px] text-destructive">{errors.slug}</p>
              )}
              <p className="text-[11.5px] text-muted-foreground">
                Changing this breaks any existing links to your assistant.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-origins">
                Websites allowed to embed the assistant
              </Label>
              <Textarea
                id="org-origins"
                value={allowedOrigins}
                onChange={(event) => setAllowedOrigins(event.target.value)}
                disabled={!canEdit}
                aria-invalid={Boolean(errors.allowedOrigins)}
                placeholder={"https://www.example.com\nhttps://help.example.com"}
                className="min-h-20 font-mono text-[12px]"
                spellCheck={false}
              />
              {errors.allowedOrigins && (
                <p className="text-[12px] text-destructive">
                  {errors.allowedOrigins}
                </p>
              )}
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                One origin per line. Leave empty to allow the widget anywhere —
                fine while evaluating, but set it before going live so another
                site can't embed your assistant.
              </p>
            </div>

            {canEdit && (
              <div className="flex justify-end pt-1">
                <Button onClick={save} disabled={busy || !dirty}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium">Put the assistant on your site</p>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                The embed snippet, launcher options, shareable link and a live
                preview live on the Install page.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/app/install">
                Open Install
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="border-destructive/25">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
                Deleting this workspace permanently removes its conversations,
                knowledge base, escalations and members.
              </p>
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                className="shrink-0"
              >
                Delete workspace
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {org.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Every conversation, knowledge article and
              escalation in this workspace will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={destroy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
