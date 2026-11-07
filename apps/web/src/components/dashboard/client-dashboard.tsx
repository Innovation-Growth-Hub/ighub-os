"use client";

import Link from "next/link";
import { CircleCheck, Circle, FolderKanban, Receipt } from "lucide-react";
import { projectProgress, useDb, userById } from "@/lib/store";
import type { User } from "@ighub/shared";
import { formatDate, formatNaira } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, Progress } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";

/** Client portal home: own projects, milestones and invoices only. */
export function ClientDashboard({ user }: { user: User }) {
  const { projects, invoices, users } = useDb();
  const mine = projects.filter((p) => p.clientId === user.id);
  const myInvoices = invoices.filter((i) => i.clientId === user.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  if (!mine.length) {
    return <EmptyState icon={FolderKanban} title="No projects yet" description="Projects IGHub runs for you will show up here." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{user.company} × IGHub</h1>
        <p className="text-sm text-muted">Your projects with Innovation Growth Hub.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {mine.map((p) => {
          const pm = userById(users, p.managerId);
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/projects/${p.id}`} className="text-lg font-extrabold hover:underline">{p.name}</Link>
                  <p className="mt-1 text-sm text-muted">{p.description}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="font-bold">Progress</span>
                <span className="font-extrabold">{projectProgress(p)}%</span>
              </div>
              <Progress value={projectProgress(p)} className="mt-2 h-3" label="Project progress" />
              <ul className="mt-5 space-y-2">
                {p.milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-2.5 text-sm">
                    {m.done ? <CircleCheck className="size-4 text-primary-ink" aria-label="Done" /> : <Circle className="size-4 text-muted" aria-label="Not done" />}
                    <span className={m.done ? "font-semibold" : "font-semibold text-muted"}>{m.title}</span>
                    <span className="ml-auto text-xs text-muted">{formatDate(m.dueDate)}</span>
                  </li>
                ))}
              </ul>
              {pm && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <Avatar name={pm.name} size="sm" />
                  <div className="text-sm">
                    <p className="font-bold">{pm.name}</p>
                    <p className="text-xs text-muted">Your project manager · {pm.email}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader title="Invoices" />
        <ul className="space-y-2">
          {myInvoices.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-canvas p-4">
              <Receipt className="size-5 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{i.number}</p>
                <p className="text-xs text-muted">Issued {formatDate(i.issuedAt)} · Due {formatDate(i.dueAt)}</p>
              </div>
              <p className="font-extrabold">{formatNaira(i.amount)}</p>
              <StatusBadge status={i.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
