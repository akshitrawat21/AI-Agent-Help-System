"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Loader2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  suspended: boolean;
  createdAt: string;
  owner: { name: string; email: string } | null;
  staff: number;
  staffOnline: number;
  conversations: number;
  articles: number;
  pendingEscalations: number;
};

export function TenantConsole({ initial }: { initial: Tenant[] }) {
  const router = useRouter();
  const [tenants, setTenants] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const response = await fetch("/api/admin/tenants");
    const payload = await response.json();
    setTenants(payload.tenants ?? []);
  };

  const setSuspended = async (tenant: Tenant, suspended: boolean) => {
    setBusyId(tenant.id);
    const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended }),
    });
    setBusyId(null);

    if (!response.ok) {
      toast.error("Couldn't update that tenant");
      return;
    }
    toast.success(
      suspended
        ? `${tenant.name} suspended — its assistant is offline`
        : `${tenant.name} reactivated`
    );
    reload();
  };

  const enter = async (tenant: Tenant) => {
    setBusyId(tenant.id);
    const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "POST",
    });
    setBusyId(null);

    if (!response.ok) {
      toast.error("Couldn't open that workspace");
      return;
    }
    router.push("/app");
    router.refresh();
  };

  const remove = async (tenant: Tenant) => {
    const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "DELETE",
    });
    setDeleting(null);

    if (!response.ok) {
      toast.error("Couldn't delete that tenant");
      return;
    }
    toast.success(`${tenant.name} deleted`);
    reload();
  };

  const totals = tenants.reduce(
    (sum, tenant) => ({
      conversations: sum.conversations + tenant.conversations,
      pending: sum.pending + tenant.pendingEscalations,
      staff: sum.staff + tenant.staff,
      online: sum.online + tenant.staffOnline,
    }),
    { conversations: 0, pending: 0, staff: 0, online: 0 }
  );

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Tenants" value={String(tenants.length)} hint={`${tenants.filter((t) => t.suspended).length} suspended`} />
          <StatCard label="Support staff" value={String(totals.staff)} hint={`${totals.online} online now`} tone={totals.online > 0 ? "positive" : "neutral"} />
          <StatCard label="Conversations" value={String(totals.conversations)} hint="All tenants, all time" />
          <StatCard label="Awaiting a human" value={String(totals.pending)} hint="Across every queue" tone={totals.pending > 0 ? "warning" : "neutral"} />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New tenant
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {tenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No tenants yet"
              description="Create one here, or let clients sign up themselves."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3 text-right">Staff</th>
                    <th className="px-4 py-3 text-right">Conversations</th>
                    <th className="px-4 py-3 text-right">Knowledge</th>
                    <th className="px-4 py-3 text-right">Waiting</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="stagger divide-y divide-border">
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className={cn(
                        "transition-colors hover:bg-accent/40",
                        tenant.suspended && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
                            {tenant.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{tenant.name}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              /w/{tenant.slug} · since {shortDate(tenant.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tenant.owner ? (
                          <div className="min-w-0">
                            <p className="truncate">{tenant.owner.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {tenant.owner.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="tabular px-4 py-3 text-right">
                        {tenant.staff}
                        {tenant.staffOnline > 0 && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {tenant.staffOnline}
                          </span>
                        )}
                      </td>
                      <td className="tabular px-4 py-3 text-right">{tenant.conversations}</td>
                      <td className="tabular px-4 py-3 text-right">{tenant.articles}</td>
                      <td className="tabular px-4 py-3 text-right">
                        {tenant.pendingEscalations > 0 ? (
                          <Badge variant="warning">{tenant.pendingEscalations}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tenant.suspended ? (
                          <Badge variant="danger">Suspended</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => enter(tenant)}
                            disabled={busyId === tenant.id}
                          >
                            {busyId === tenant.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ArrowUpRight className="size-3.5" />
                            )}
                            Enter
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`Manage ${tenant.name}`}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <a href={`/w/${tenant.slug}`} target="_blank" rel="noreferrer">
                                  Open public assistant
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setSuspended(tenant, !tenant.suspended)}
                              >
                                {tenant.suspended ? "Reactivate" : "Suspend"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(tenant)}
                              >
                                Delete tenant
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreateTenantDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          reload();
        }}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the tenant's staff memberships,
              conversations, knowledge base and escalations. Suspending is
              reversible; this is not.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove(deleting)}
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

function CreateTenantDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    orgName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: event.target.value }),
    "aria-invalid": Boolean(errors[key]),
    required: true,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});

    const response = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrors(payload.errors ?? { form: payload.error ?? "Couldn't create it" });
      setBusy(false);
      return;
    }

    const payload = await response.json();
    setBusy(false);
    setForm({ orgName: "", ownerName: "", ownerEmail: "", ownerPassword: "" });
    toast.success(
      payload.ownerExisted
        ? `Tenant created — ${form.ownerEmail} already had an account and now owns it`
        : `Tenant created at /w/${payload.tenant.slug}`
    );
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New tenant</DialogTitle>
            <DialogDescription>
              Provision a client's workspace and its first owner. They can add
              their own staff and knowledge from there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-5">
            {errors.form && <p className="text-[12.5px] text-destructive">{errors.form}</p>}

            <div className="space-y-1.5">
              <Label htmlFor="t-org">Company name</Label>
              <Input id="t-org" placeholder="Acme Robotics" autoFocus {...field("orgName")} />
              {errors.orgName && <p className="text-[12px] text-destructive">{errors.orgName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-owner">Owner name</Label>
              <Input id="t-owner" placeholder="Priya Nair" {...field("ownerName")} />
              {errors.ownerName && <p className="text-[12px] text-destructive">{errors.ownerName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-email">Owner email</Label>
              <Input id="t-email" type="email" placeholder="priya@acme.com" {...field("ownerEmail")} />
              {errors.ownerEmail && <p className="text-[12px] text-destructive">{errors.ownerEmail}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-pass">Starting password</Label>
              <Input id="t-pass" type="text" placeholder="At least 8 characters" {...field("ownerPassword")} />
              {errors.ownerPassword && <p className="text-[12px] text-destructive">{errors.ownerPassword}</p>}
              <p className="text-[11.5px] text-muted-foreground">
                Share this with them directly — there's no invite email in this build.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Create tenant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
