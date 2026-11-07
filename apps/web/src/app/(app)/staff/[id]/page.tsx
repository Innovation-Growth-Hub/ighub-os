"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, KeyRound, Mail, MapPin, Pencil, Phone, UserX } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { canManageAccounts, ROLE_LABELS } from "@ighub/shared";
import { OFFICES } from "@ighub/shared";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState, StatTile } from "@/components/ui/misc";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { STAFF_TYPE_LABELS, StaffForm } from "@/components/staff/staff-form";
import { Credentials } from "@/components/staff/credentials";
import { useAccounts, useActions, useDailyLogs, useTasks, useUsers } from "@/lib/api/hooks";

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const me = useCurrentUser();
  const canManage = canManageAccounts(me.role);
  // Admins get the full account list (phones, first-login flag); others the directory.
  const accounts = useAccounts();
  const directory = useUsers();
  const users = accounts.length ? accounts : directory;
  const tasks = useTasks();
  const logs = useDailyLogs();
  const { updateAccount, setAccountActive, resetPassword } = useActions();
  const [editing, setEditing] = useState(false);
  const [resetTo, setResetTo] = useState<string | null>(null);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return <EmptyState icon={UserX} title="Staff member not found" action={<Link href="/staff" className="font-bold text-primary-ink">Back to staff</Link>} />;
  }

  const myTasks = tasks.filter((t) => t.assignedTo === user.id);
  const myLogs = logs.filter((l) => l.userId === user.id);

  return (
    <div className="space-y-6">
      <Link href="/staff" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All staff
      </Link>

      <Card className="flex flex-col gap-6 md:flex-row md:items-center">
        <Avatar name={user.name} size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">{user.name}</h1>
            <StatusBadge status={user.isActive ? "active" : "inactive"} />
            {user.mustChangePassword && <StatusBadge status="must_change_password" />}
          </div>
          <p className="text-muted">{user.position} · {ROLE_LABELS[user.role]}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Mail className="size-4" />{user.email}</span>
            {user.phone && <span className="flex items-center gap-1.5"><Phone className="size-4" />{user.phone}</span>}
            {user.officeLocation && <span className="flex items-center gap-1.5"><MapPin className="size-4" />{OFFICES[user.officeLocation]}</span>}
            {user.staffType && <Badge tone="mint">{STAFF_TYPE_LABELS[user.staffType]}</Badge>}
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                if (!confirm(`Reset ${user.name}'s password? They'll have to set a new one when they next log in.`)) return;
                const res = await resetPassword(user.id);
                if (res) setResetTo(res.temporaryPassword);
              }}
            >
              <KeyRound className="size-4" /> Reset password
            </Button>
            {user.id !== me.id && (
              <Button variant="secondary" onClick={() => setAccountActive(user.id, !user.isActive)}>
                {user.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            <Button onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Open tasks" value={String(myTasks.filter((t) => t.status !== "complete").length)} />
        <StatTile label="Completed tasks" value={String(myTasks.filter((t) => t.status === "complete").length)} />
        <StatTile label="Joined" value={formatDate(user.joinedAt, { day: undefined })} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent daily logs" description={me.role === "super_admin" ? "View only" : undefined} />
          {myLogs.length === 0 ? (
            <p className="text-sm text-muted">{me.role === "super_admin" ? "No logs yet." : "Only the super admin can read other people's logs."}</p>
          ) : (
            <ul className="space-y-2">
              {myLogs.slice(0, 7).map((l) => (
                <li key={l.id} className="rounded-2xl bg-canvas p-3 text-sm">
                  <p className="font-bold">{formatDate(l.date, { weekday: "short" })}</p>
                  <ul className="mt-1 list-disc pl-5 text-muted">
                    {l.entries.map((e) => <li key={e.id}>{e.description}{e.hours !== undefined && ` (${e.hours}h)`}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Tasks" />
          <ul className="space-y-2">
            {myTasks.map((t) => (
              <li key={t.id} className="rounded-2xl bg-canvas p-3">
                <p className="text-sm font-bold">{t.title}</p>
                <div className="mt-2 flex gap-1.5"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
              </li>
            ))}
            {myTasks.length === 0 && <p className="text-sm text-muted">No tasks assigned.</p>}
          </ul>
        </Card>
      </div>

      <Modal open={resetTo !== null} onClose={() => setResetTo(null)} title="Password reset">
        {resetTo && <Credentials reset user={user} password={resetTo} onDone={() => setResetTo(null)} />}
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${user.name}`}>
        <StaffForm
          initial={user}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            // Email changes aren't supported yet; send everything else.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { email, ...patch } = v;
            if (await updateAccount(user.id, patch)) setEditing(false);
          }}
        />
      </Modal>
    </div>
  );
}
