"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@/lib/auth/roles";
import { projectProgress, useDb, userById } from "@/lib/store";
import type { ProjectStatus } from "@/lib/types";
import { visibleProjects } from "@/lib/access";
import { formatDate, formatNairaCompact } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { Avatar, EmptyState, PageHeader, Pills, Progress } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";

export default function ProjectsPage() {
  const user = useCurrentUser();
  const { projects, users } = useDb();
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const mine = visibleProjects(projects, user);
  const shown = mine.filter((p) => status === "all" || p.status === status);
  const canCreate = isAdmin(user.role) || user.role === "project_manager";
  const showMoney = canCreate;

  return (
    <>
      <PageHeader
        title="Projects"
        description={user.role === "client" ? "Projects IGHub is delivering for you" : `${mine.filter((p) => p.status === "active").length} active projects`}
        actions={canCreate && <LinkButton href="/projects/new"><Plus className="size-4" /> New project</LinkButton>}
      />
      <div className="mb-6">
        <Pills
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: mine.length },
            { value: "active", label: "Active" },
            { value: "planning", label: "Planning" },
            { value: "on_hold", label: "On hold" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects" description="Nothing matches this filter." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const pct = projectProgress(p);
            const client = userById(users, p.clientId);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex flex-col rounded-3xl bg-surface p-6 transition-colors hover:bg-surface-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold text-muted">{client?.company ?? "Internal"}</p>
                  <StatusBadge status={p.status} />
                </div>
                <h2 className="mt-2 text-lg font-extrabold tracking-tight">{p.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
                <div className="mt-auto pt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-muted">{formatDate(p.startDate, { year: undefined })} – {formatDate(p.endDate)}</span>
                    <span className="font-extrabold">{pct}%</span>
                  </div>
                  <Progress value={pct} label={`${p.name} progress`} />
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {p.teamIds.slice(0, 4).map((id) => {
                        const u = userById(users, id);
                        return u ? <Avatar key={id} name={u.name} size="sm" /> : null;
                      })}
                    </div>
                    {showMoney && (
                      <span className="text-sm font-bold">
                        {formatNairaCompact(p.spent)} <span className="font-medium text-muted">/ {formatNairaCompact(p.budget)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
