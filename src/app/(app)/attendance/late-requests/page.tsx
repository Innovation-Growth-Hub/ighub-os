"use client";

import { useState, type FormEvent } from "react";
import { Check, Inbox, X } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@/lib/auth/roles";
import { useDb, userById } from "@/lib/store";
import type { RequestStatus } from "@/lib/types";
import { formatDate, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Avatar, EmptyState, PageHeader, Pills } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { AttendanceTabs } from "@/components/attendance/attendance-tabs";

export default function LateRequestsPage() {
  const user = useCurrentUser();
  const { lateRequests, users, addLateRequest, reviewLateRequest } = useDb();
  const admin = isAdmin(user.role);
  const [filter, setFilter] = useState<"all" | RequestStatus>(admin ? "pending" : "all");
  const [today] = useState(() => toDateKey(new Date()));

  const visible = lateRequests
    .filter((r) => (admin ? true : r.userId === user.id))
    .filter((r) => filter === "all" || r.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    addLateRequest(user.id, String(f.get("date")), String(f.get("reason")));
    e.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="Attendance" description="Approved requests don't count toward weekly penalties." />
      <AttendanceTabs />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold">{admin ? "Requests to review" : "My requests"}</h2>
            <Pills
              label="Filter by status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "all", label: "All" },
              ]}
            />
          </div>
          {visible.length === 0 ? (
            <EmptyState icon={Inbox} title="Nothing here" description="No requests match this filter." />
          ) : (
            <ul className="space-y-2">
              {visible.map((r) => {
                const u = userById(users, r.userId);
                return (
                  <li key={r.id} className="flex flex-col gap-3 rounded-3xl bg-canvas p-4 sm:flex-row sm:items-center">
                    <Avatar name={u?.name ?? "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {u?.name} <span className="font-medium text-muted">· late on {formatDate(r.date, { weekday: "short" })}</span>
                      </p>
                      <p className="text-sm text-muted">{r.reason}</p>
                    </div>
                    {admin && r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="danger" onClick={() => reviewLateRequest(r.id, "rejected")}><X className="size-4" /> Reject</Button>
                        <Button size="sm" onClick={() => reviewLateRequest(r.id, "approved")}><Check className="size-4" /> Approve</Button>
                      </div>
                    ) : (
                      <StatusBadge status={r.status} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="New late request" description="Explain a late arrival so it can be excused." />
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" required defaultValue={today} max={today} />
            </Field>
            <Field label="Reason" htmlFor="reason">
              <Textarea id="reason" name="reason" required placeholder="e.g. Traffic on Aba road" />
            </Field>
            <Button type="submit" className="w-full justify-center">Submit request</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
