"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BookOpen, Plus, Users } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { courseProgress, useDb, userById } from "@/lib/store";
import { formatDate, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

export default function LmsPage() {
  const user = useCurrentUser();
  const { courses, enrollments, users, addCourse, enroll } = useDb();
  const [creating, setCreating] = useState(false);
  const [today] = useState(() => toDateKey(new Date()));
  const isStudent = user.role === "student";
  const trainers = users.filter((u) => u.role === "trainer");

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    addCourse({
      title: String(f.get("title")),
      description: String(f.get("description")),
      category: String(f.get("category")),
      trainerId: String(f.get("trainerId")),
      startDate: String(f.get("startDate")),
      endDate: String(f.get("endDate")),
    });
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Learning"
        description={isStudent ? "Your courses and the IGHub catalogue" : "Courses, lessons and student progress"}
        actions={!isStudent && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New course</Button>}
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => {
          const enrolled = enrollments.filter((e) => e.courseId === c.id);
          const mine = enrolled.find((e) => e.userId === user.id);
          const avg = enrolled.length ? Math.round(enrolled.reduce((a, e) => a + courseProgress(c, e), 0) / enrolled.length) : 0;
          const state = today < c.startDate ? "Upcoming" : today > c.endDate ? "Ended" : "Running";
          return (
            <div key={c.id} className="flex flex-col rounded-3xl bg-surface p-6">
              <div className="flex items-center justify-between">
                <Badge tone="mint">{c.category}</Badge>
                <span className="text-xs font-bold text-muted">{state}</span>
              </div>
              <Link href={`/lms/${c.id}`} className="mt-3 text-lg font-extrabold tracking-tight hover:underline">{c.title}</Link>
              <p className="mt-1 text-sm text-muted">{c.description}</p>
              <p className="mt-3 text-xs font-semibold text-muted">
                {userById(users, c.trainerId)?.name} · {formatDate(c.startDate, { year: undefined })} – {formatDate(c.endDate)}
              </p>
              <div className="mt-auto pt-5">
                <div className="mb-3 flex gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1"><BookOpen className="size-4" />{c.lessons.length} lessons</span>
                  <span className="flex items-center gap-1"><Users className="size-4" />{enrolled.length} students</span>
                </div>
                {isStudent ? (
                  mine ? (
                    <>
                      <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">Your progress</span><span className="font-extrabold">{courseProgress(c, mine)}%</span></div>
                      <Progress value={courseProgress(c, mine)} label={`${c.title} progress`} />
                    </>
                  ) : (
                    <Button variant="mint" className="w-full justify-center" onClick={() => enroll(user.id, c.id)}>Enrol</Button>
                  )
                ) : (
                  <>
                    <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">Average progress</span><span className="font-extrabold">{avg}%</span></div>
                    <Progress value={avg} label={`${c.title} average progress`} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New course">
        <form onSubmit={onCreate} className="space-y-4">
          <Field label="Title" htmlFor="title"><Input id="title" name="title" required /></Field>
          <Field label="Description" htmlFor="description"><Textarea id="description" name="description" required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="category"><Input id="category" name="category" required placeholder="Development" /></Field>
            <Field label="Trainer" htmlFor="trainerId">
              <Select id="trainerId" name="trainerId" defaultValue={user.role === "trainer" ? user.id : trainers[0]?.id}>
                {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Starts" htmlFor="startDate"><Input id="startDate" name="startDate" type="date" required defaultValue={today} /></Field>
            <Field label="Ends" htmlFor="endDate"><Input id="endDate" name="endDate" type="date" required /></Field>
          </div>
          <Button type="submit" className="w-full justify-center">Create course</Button>
        </form>
      </Modal>
    </>
  );
}
