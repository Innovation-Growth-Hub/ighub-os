"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ChevronLeft } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { useDb } from "@/lib/store";
import { workers } from "@/lib/attendance";
import type { ProjectStatus } from "@ighub/shared";
import { cn, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Avatar, PageHeader } from "@/components/ui/misc";

export default function NewProjectPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const { users, addProject } = useDb();
  const [team, setTeam] = useState<string[]>([]);
  const [today] = useState(() => toDateKey(new Date()));
  const clients = users.filter((u) => u.role === "client");
  const people = workers(users);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = addProject({
      name: String(f.get("name")),
      description: String(f.get("description")),
      clientId: String(f.get("clientId")) || undefined,
      managerId: String(f.get("managerId")),
      teamIds: team,
      startDate: String(f.get("startDate")),
      endDate: String(f.get("endDate")),
      budget: Number(f.get("budget")),
      status: f.get("status") as ProjectStatus,
    });
    router.push(`/projects/${p.id}`);
  }

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Projects
      </Link>
      <PageHeader title="New project" />
      <Card className="max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Project name" htmlFor="name"><Input id="name" name="name" required className="bg-canvas" /></Field>
          <Field label="Description" htmlFor="description"><Textarea id="description" name="description" required className="bg-canvas" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Client" htmlFor="clientId">
              <Select id="clientId" name="clientId" defaultValue="" className="bg-canvas">
                <option value="">Internal project</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company} · {c.name}</option>)}
              </Select>
            </Field>
            <Field label="Project manager" htmlFor="managerId">
              <Select id="managerId" name="managerId" defaultValue={user.id} className="bg-canvas">
                {people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
            <Field label="Start date" htmlFor="startDate"><Input id="startDate" name="startDate" type="date" required defaultValue={today} className="bg-canvas" /></Field>
            <Field label="End date" htmlFor="endDate"><Input id="endDate" name="endDate" type="date" required className="bg-canvas" /></Field>
            <Field label="Budget (₦)" htmlFor="budget"><Input id="budget" name="budget" type="number" min={0} step={1000} required className="bg-canvas" /></Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue="planning" className="bg-canvas">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On hold</option>
              </Select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Team</legend>
            <div className="flex flex-wrap gap-2">
              {people.map((u) => {
                const on = team.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTeam((t) => (on ? t.filter((x) => x !== u.id) : [...t, u.id]))}
                    className={cn("flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-bold transition-colors", on ? "bg-mint" : "bg-canvas text-muted hover:text-ink")}
                  >
                    <Avatar name={u.name} size="sm" /> {u.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Button type="submit" size="lg">Create project</Button>
        </form>
      </Card>
    </>
  );
}
