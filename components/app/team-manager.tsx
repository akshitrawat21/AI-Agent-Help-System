"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AvatarBadge } from "@/components/app/avatar-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/constants";
import { shortDate } from "@/lib/format";

export type Member = {
  membershipId: string;
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
  joinedAt: string;
  answered: number;
};

export function TeamManager({
  initial,
  currentUserId,
  currentRole,
  canManage,
}: {
  initial: Member[];
  currentUserId: string;
  currentRole: string;
  canManage: boolean;
}) {
  const [members, setMembers] = useState(initial);
  const [inviting, setInviting] = useState(false);

  const reload = async () => {
    const response = await fetch("/api/team");
    const payload = await response.json();
    setMembers(payload.members ?? []);
  };

  const changeRole = async (member: Member, role: string) => {
    const response = await fetch(`/api/team/${member.membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      toast.error(payload.error ?? "Couldn't change that role");
      return;
    }

    await reload();
    toast.success(`${member.name} is now ${ROLE_LABELS[role as Role]}`);
  };

  const remove = async (member: Member) => {
    const response = await fetch(`/api/team/${member.membershipId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      toast.error(payload.error ?? "Couldn't remove them");
      return;
    }

    await reload();
    toast.success(`${member.name} removed from the workspace`);
  };

  return (
    <>
      <div className="space-y-4">
        {canManage && (
          <div className="flex justify-end">
            <Button onClick={() => setInviting(true)}>
              <UserPlus className="size-4" />
              Add teammate
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="stagger divide-y divide-border">
            {members.map((member) => {
              const isSelf = member.id === currentUserId;

              return (
                <li
                  key={member.membershipId}
                  className="flex items-center gap-3 p-4"
                >
                  <AvatarBadge name={member.name} color={member.avatarColor} />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[13.5px] font-medium">
                      <span className="truncate">{member.name}</span>
                      {isSelf && <Badge variant="outline">You</Badge>}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {member.email}
                    </p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="tabular text-[12.5px] font-medium">
                      {member.answered}
                    </p>
                    <p className="text-[11px] text-muted-foreground">answered</p>
                  </div>

                  <div className="hidden w-24 text-right sm:block">
                    <p className="text-[11px] text-muted-foreground">
                      joined {shortDate(member.joinedAt)}
                    </p>
                  </div>

                  <Badge
                    variant={member.role === "owner" ? "primary" : "default"}
                    className="shrink-0 capitalize"
                  >
                    {ROLE_LABELS[member.role as Role] ?? member.role}
                  </Badge>

                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Manage ${member.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Change role</DropdownMenuLabel>
                        {ROLES.map((role) => (
                          <DropdownMenuItem
                            key={role}
                            disabled={
                              member.role === role ||
                              // Only an owner can touch ownership.
                              ((role === "owner" || member.role === "owner") &&
                                currentRole !== "owner")
                            }
                            onClick={() => changeRole(member, role)}
                          >
                            {ROLE_LABELS[role]}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={
                            member.role === "owner" && currentRole !== "owner"
                          }
                          onClick={() => remove(member)}
                        >
                          {isSelf ? "Leave workspace" : "Remove"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {ROLES.map((role) => (
            <div
              key={role}
              className="rounded-lg border border-border bg-card p-3"
            >
              <p className="text-[12.5px] font-medium">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <InviteDialog
        open={inviting}
        canAddOwner={currentRole === "owner"}
        onClose={() => setInviting(false)}
        onAdded={async () => {
          setInviting(false);
          await reload();
        }}
      />
    </>
  );
}

function InviteDialog({
  open,
  canAddOwner,
  onClose,
  onAdded,
}: {
  open: boolean;
  canAddOwner: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});

    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrors(payload.errors ?? { form: payload.error ?? "Couldn't add them" });
      setBusy(false);
      return;
    }

    const payload = await response.json();
    setBusy(false);
    setForm({ name: "", email: "", password: "", role: "agent" });
    toast.success(
      payload.existingAccount
        ? "Added their existing account to this workspace"
        : "Teammate added"
    );
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add a teammate</DialogTitle>
            <DialogDescription>
              Email delivery isn't wired up in this build, so set their starting
              password here and share it with them directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-5">
            {errors.form && (
              <p className="text-[12.5px] text-destructive">{errors.form}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Riley Diaz"
                aria-invalid={Boolean(errors.name)}
                required
                autoFocus
              />
              {errors.name && (
                <p className="text-[12px] text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="riley@company.com"
                aria-invalid={Boolean(errors.email)}
                required
              />
              {errors.email && (
                <p className="text-[12px] text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-password">Starting password</Label>
              <Input
                id="member-password"
                type="text"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                placeholder="At least 8 characters"
                aria-invalid={Boolean(errors.password)}
                required
              />
              {errors.password && (
                <p className="text-[12px] text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm({ ...form, role: value })}
              >
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter(
                    (role) => role !== "owner" || canAddOwner
                  ).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                {ROLE_DESCRIPTIONS[form.role as Role]}
              </p>
              {errors.role && (
                <p className="text-[12px] text-destructive">{errors.role}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Add teammate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
