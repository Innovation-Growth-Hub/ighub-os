"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { canManageTasks, isAdmin } from "@ighub/shared";
import { assignableUsers, canManageTask, managedProjects } from "@ighub/shared";
import type { Priority, Task, TaskStatus } from "@ighub/shared";
import { cn, formatDate, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, PageHeader, Pills } from "@/components/ui/misc";
import { PriorityBadge, Tag } from "@/components/ui/badge";
import { useActions, useProjects, useTasks, useUsers } from "@/lib/api/hooks";
import { userById } from "@/lib/derived";

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "pending", label: "Pending" },
  { status: "in_progress", label: "In progress" },
  { status: "complete", label: "Complete" },
];

export default function TasksPage() {
  const user = useCurrentUser();
  const tasks = useTasks();
  const users = useUsers();
  const projects = useProjects();
  const { addTask, moveTask, deleteTask } = useActions();
  // Admins and PMs run the whole board; everyone else works their own tasks.
  const canManage = canManageTasks(user.role);
  const [scope, setScope] = useState<"mine" | "all">(canManage ? "all" : "mine");
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [today] = useState(() => toDateKey(new Date()));

  // PMs only see and manage tasks on the projects they run (or that they created).
  const manages = (t: Task) => canManageTask(t, projects, user);
  const visible = tasks.filter((t) => (canManage && scope === "all" && manages(t)) || t.assignedTo === user.id);
  const canMove = (t: Task) => manages(t) || t.assignedTo === user.id;
  const assignees = assignableUsers(users, projects, user);
  const projectChoices = isAdmin(user.role) ? projects : managedProjects(projects, user);

  function onDrop(e: DragEvent, status: TaskStatus) {
    e.preventDefault();
    const task = tasks.find((t) => t.id === e.dataTransfer.getData("text/plain"));
    if (task && canMove(task)) {
      moveTask(task.id, status);
    }
    setDragOver(null);
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const created = await addTask({
      title: String(f.get("title")),
      description: String(f.get("description")) || undefined,
      assignedTo: String(f.get("assignedTo")),
      dueDate: String(f.get("dueDate")),
      priority: f.get("priority") as Priority,
      projectId: String(f.get("projectId")) || undefined,
      tags: String(f.get("tags")).split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (created) setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description={
          canManage
            ? "Drag cards between columns, or use the status menu on each card."
            : "Your tasks. Drag a card to update its status, or move it to Complete when you're done."
        }
        actions={
          <>
            {canManage && <Pills label="Task scope" value={scope} onChange={setScope} options={[{ value: "mine", label: "My tasks" }, { value: "all", label: isAdmin(user.role) ? "All tasks" : "My projects" }]} />}
            {canManage && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New task</Button>}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = visible.filter((t) => t.status === col.status).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          return (
            <section
              key={col.status}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.status);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(e, col.status)}
              className={cn("min-h-64 rounded-3xl p-4 transition-colors", dragOver === col.status ? "bg-mint-soft" : "bg-surface")}
            >
              <h2 className="mb-4 flex items-center gap-2 px-2 font-extrabold">
                {col.label}
                <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">{items.length}</span>
              </h2>
              <ul className="space-y-3">
                {items.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    assignee={userById(users, t.assignedTo)?.name ?? "Unassigned"}
                    overdue={t.status !== "complete" && t.dueDate < today}
                    canDelete={manages(t)}
                    canMove={canMove(t)}
                    onMove={(s) => {
                      moveTask(t.id, s);
                    }}
                    onDelete={() => deleteTask(t.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New task">
        <form onSubmit={onCreate} className="space-y-4">
          <Field label="Title" htmlFor="title"><Input id="title" name="title" required /></Field>
          <Field label="Description" htmlFor="description"><Textarea id="description" name="description" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assign to" htmlFor="assignedTo" hint={isAdmin(user.role) ? undefined : "People on your projects."}>
              <Select id="assignedTo" name="assignedTo" required>
                {assignees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
            <Field label="Due date" htmlFor="dueDate"><Input id="dueDate" name="dueDate" type="date" required defaultValue={today} /></Field>
            <Field label="Priority" htmlFor="priority">
              <Select id="priority" name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Project" htmlFor="projectId">
              <Select id="projectId" name="projectId" defaultValue="">
                <option value="">None</option>
                {projectChoices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Tags" htmlFor="tags" hint="Comma separated"><Input id="tags" name="tags" placeholder="frontend, vfd" /></Field>
          <Button type="submit" className="w-full justify-center">Create task</Button>
        </form>
      </Modal>
    </>
  );
}

function TaskCard({
  task,
  assignee,
  overdue,
  canDelete,
  canMove,
  onMove,
  onDelete,
}: {
  task: Task;
  assignee: string;
  overdue: boolean;
  canDelete: boolean;
  canMove: boolean;
  onMove: (s: TaskStatus) => void;
  onDelete: () => void;
}) {
  return (
    <li
      draggable={canMove}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className={cn("rounded-3xl bg-canvas p-4", canMove && "cursor-grab active:cursor-grabbing")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{task.description}</p>}
      {task.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Avatar name={assignee} size="sm" />
        <span className={cn("flex items-center gap-1 text-xs font-semibold", overdue ? "text-red-700" : "text-muted")}>
          <CalendarDays className="size-3.5" aria-hidden />
          {overdue && "Overdue · "}
          {formatDate(task.dueDate, { year: undefined })}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <label className={cn(!canMove && "hidden")}>
            <span className="sr-only">Status for {task.title}</span>
            <select
              value={task.status}
              onChange={(e) => onMove(e.target.value as TaskStatus)}
              className="h-8 rounded-full bg-surface-2 px-2 text-xs font-bold"
            >
              {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
          </label>
          {canDelete && (
            <button type="button" aria-label={`Delete ${task.title}`} onClick={onDelete} className="flex size-8 items-center justify-center rounded-full text-red-700 hover:bg-red-50">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
