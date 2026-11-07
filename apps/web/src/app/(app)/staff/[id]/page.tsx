"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, KeyRound, Mail, MapPin, Pencil, Phone, UserX } from "lucide-react";
import { computePenalties, useDb } from "@/lib/store";
import { authClient, generateTempPassword, useCurrentUser } from "@/lib/auth/auth-client";
import { canManageAccounts, ROLE_LABELS } from "@ighub/shared";
import { OFFICES } from "@/lib/mock/seed";
import { formatDate, formatNaira, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState, StatTile } from "@/components/ui/misc";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { STAFF_TYPE_LABELS, StaffForm } from "@/components/staff/staff-form";
import { Credentials } from "@/components/staff/credentials";

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const me = useCurrentUser();
  const { users, attendance, tasks, lateRequests, updateUser } = useDb();
  const canManage = canManageAccounts(me.role);
  const [editing, setEditing] = useState(false);
  const [resetTo, setResetTo] = useState<string | null>(null);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return <EmptyState icon={UserX} title="Staff member not found" action={<Link href="/staff" className="font-bold text-primary-ink">Back to staff</Link>} />;
  }

  const mine = attendance.filter((a) => a.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));
  const last20 = mine.slice(0, 20);
  const rate = (s: string) => (last20.length ? Math.round((last20.filter((a) => a.status === s).length / last20.length) * 100) : 0);
  const penalties = computePenalties(mine, lateRequests);
  const myTasks = tasks.filter((t) => t.assignedTo === user.id);

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
                const password = generateTempPassword();
                const { error } = await authClient.admin.setUserPassword({ userId: user.id, newPassword: password });
                if (error) return alert(error.message);
                setResetTo(password);
              }}
            >
              <KeyRound className="size-4" /> Reset password
            </Button>
            {user.id !== me.id && (
              <Button variant="secondary" onClick={() => updateUser(user.id, { isActive: !user.isActive })}>
                {user.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            <Button onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="On time (last 20 days)" value={`${rate("on_time")}%`} />
        <StatTile label="Late" value={`${rate("late")}%`} />
        <StatTile label="Absent" value={`${rate("absent")}%`} />
        <StatTile label="Penalties" value={formatNaira(penalties.reduce((a, p) => a + p.amount, 0))} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Attendance history" />
          <Table>
            <THead>
              <tr><Th>Date</Th><Th>Clock in</Th><Th>Clock out</Th><Th>Status</Th></tr>
            </THead>
            <tbody>
              {mine.slice(0, 10).map((a) => (
                <Tr key={a.id}>
                  <Td className="font-semibold whitespace-nowrap">{formatDate(a.date, { weekday: "short" })}</Td>
                  <Td>{a.clockIn ? formatTime(a.clockIn) : "—"}</Td>
                  <Td>{a.clockOut ? formatTime(a.clockOut) : "—"}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
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
          onSubmit={(v) => {
            updateUser(user.id, v);
            setEditing(false);
          }}
        />
      </Modal>
    </div>
  );
}
