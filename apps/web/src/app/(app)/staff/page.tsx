"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Search, UserPlus, Users } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { canManageAccounts, ROLE_LABELS } from "@ighub/shared";
import { OFFICES } from "@ighub/shared";
import type { StaffType, User } from "@ighub/shared";
import { workers } from "@ighub/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState, PageHeader, Pills } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { STAFF_TYPE_LABELS, StaffForm } from "@/components/staff/staff-form";
import { Credentials } from "@/components/staff/credentials";
import { useAccounts, useActions } from "@/lib/api/hooks";

type Filter = "all" | StaffType;

export default function StaffPage() {
  const me = useCurrentUser();
  const users = useAccounts();
  const { createAccount } = useActions();
  const canManage = canManageAccounts(me.role);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ user: User; password: string } | null>(null);

  // Staff = everyone internal, including inactive members.
  const staff = users.filter((u) => !["client", "student"].includes(u.role));
  const shown = staff.filter(
    (u) =>
      (filter === "all" || u.staffType === filter) &&
      `${u.name} ${u.email} ${u.position}`.toLowerCase().includes(q.toLowerCase()),
  );
  const count = (t: StaffType) => staff.filter((u) => u.staffType === t).length;

  return (
    <>
      <PageHeader
        title="Staff"
        description={`${workers(users).length} active team members across ${Object.keys(OFFICES).length} offices`}
        actions={
          canManage ? (
            <Button onClick={() => { setError(null); setAdding(true); }}><UserPlus className="size-4" /> Create account</Button>
          ) : (
            <p className="text-sm text-muted">Only the super admin can create or remove accounts.</p>
          )
        }
      />

      <Card>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Pills
            label="Filter by staff type"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: staff.length },
              { value: "core_team", label: "Core Team", count: count("core_team") },
              { value: "corper", label: "Corpers", count: count("corper") },
              { value: "intern", label: "Interns", count: count("intern") },
            ]}
          />
          <label className="relative block lg:w-72">
            <span className="sr-only">Search staff</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search name, email, role…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-full bg-canvas pl-11" />
          </label>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={Users} title="No staff match" description="Try a different filter or search." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Position</Th>
                <Th>Type</Th>
                <Th>Role</Th>
                <Th>Office</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </THead>
            <tbody>
              {shown.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <Link href={`/staff/${u.id}`} className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <span>
                        <span className="block font-bold whitespace-nowrap">{u.name}</span>
                        <span className="block text-xs text-muted">{u.email}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">{u.position}</Td>
                  <Td>{u.staffType && <Badge tone={u.staffType === "core_team" ? "mint" : "neutral"}>{STAFF_TYPE_LABELS[u.staffType]}</Badge>}</Td>
                  <Td className="whitespace-nowrap text-muted">{ROLE_LABELS[u.role]}</Td>
                  <Td className="whitespace-nowrap text-muted">{u.officeLocation ? OFFICES[u.officeLocation] : "—"}</Td>
                  <Td><StatusBadge status={!u.isActive ? "inactive" : u.mustChangePassword ? "must_change_password" : "active"} /></Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Link href={`/staff/${u.id}`} aria-label={`View ${u.name}`} className="flex size-9 items-center justify-center rounded-full hover:bg-surface-2">
                        <Eye className="size-4" />
                      </Link>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Create account">
        <StaffForm
          withPassword
          submitLabel="Create account"
          error={error}
          busy={busy}
          onSubmit={async (v, password = "") => {
            setBusy(true);
            const res = await createAccount({ ...v, staffType: v.staffType ?? "core_team", officeLocation: v.officeLocation ?? "umuahia_hq", password });
            setBusy(false);
            if (!res) return;
            setAdding(false);
            setCreated({ user: res.account, password: res.temporaryPassword });
          }}
        />
      </Modal>

      <Modal open={created !== null} onClose={() => setCreated(null)} title="Account created">
        {created && <Credentials user={created.user} password={created.password} onDone={() => setCreated(null)} />}
      </Modal>
    </>
  );
}

