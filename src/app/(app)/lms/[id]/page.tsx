"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Circle, CircleCheck, CirclePlay, GraduationCap } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { courseProgress, useDb, userById } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const { courses, enrollments, users, toggleLesson, enroll } = useDb();
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return <EmptyState icon={GraduationCap} title="Course not found" action={<Link href="/lms" className="font-bold text-primary-ink">Back to courses</Link>} />;
  }

  const isStudent = user.role === "student";
  const mine = enrollments.find((e) => e.courseId === course.id && e.userId === user.id);
  const students = enrollments.filter((e) => e.courseId === course.id);
  const totalMin = course.lessons.reduce((a, l) => a + l.durationMin, 0);

  return (
    <div className="space-y-6">
      <Link href="/lms" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Courses
      </Link>
      <Card tone="mint">
        <Badge>{course.category}</Badge>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{course.title}</h1>
        <p className="mt-1 max-w-2xl text-ink/80">{course.description}</p>
        <p className="mt-3 text-sm font-semibold text-ink/70">
          {userById(users, course.trainerId)?.name} · {formatDate(course.startDate)} – {formatDate(course.endDate)} · {course.lessons.length} lessons · {Math.round(totalMin / 60)}h
        </p>
        {isStudent && mine && (
          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex justify-between text-sm font-bold"><span>Your progress</span><span>{courseProgress(course, mine)}%</span></div>
            <Progress value={courseProgress(course, mine)} className="bg-canvas" label="Your progress" />
          </div>
        )}
        {isStudent && !mine && <Button className="mt-5" onClick={() => enroll(user.id, course.id)}>Enrol in this course</Button>}
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className={isStudent ? "xl:col-span-5" : "xl:col-span-2"}>
          <CardHeader title="Lessons" description={isStudent && mine ? "Mark lessons complete as you go." : undefined} />
          <ol className="space-y-2">
            {course.lessons.map((l, i) => {
              const done = mine?.completedLessonIds.includes(l.id);
              const content = (
                <>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-extrabold">{i + 1}</span>
                  <span className="flex-1 font-bold">{l.title}</span>
                  <span className="text-xs text-muted">{l.durationMin} min</span>
                  {isStudent && mine && (done ? <CircleCheck className="size-5 text-primary-ink" aria-label="Completed" /> : <Circle className="size-5 text-muted" aria-label="Not completed" />)}
                  {!isStudent && <CirclePlay className="size-5 text-muted" aria-hidden />}
                </>
              );
              return (
                <li key={l.id}>
                  {isStudent && mine ? (
                    <button type="button" aria-pressed={done} onClick={() => toggleLesson(mine.id, l.id)} className="flex w-full items-center gap-3 rounded-2xl bg-canvas px-4 py-3 text-left hover:bg-mint-soft">
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
            {course.lessons.length === 0 && <p className="text-sm text-muted">No lessons yet. The lesson builder arrives in Phase 1.</p>}
          </ol>
        </Card>

        {!isStudent && (
          <Card className="xl:col-span-3">
            <CardHeader title="Students" description={`${students.length} enrolled`} />
            <Table>
              <THead>
                <tr><Th>Student</Th><Th>Progress</Th><Th>Grade</Th></tr>
              </THead>
              <tbody>
                {students.map((e) => {
                  const s = userById(users, e.userId);
                  const pct = courseProgress(course, e);
                  return (
                    <Tr key={e.id}>
                      <Td><div className="flex items-center gap-3"><Avatar name={s?.name ?? "?"} size="sm" /><span className="font-bold whitespace-nowrap">{s?.name}</span></div></Td>
                      <Td className="min-w-40"><div className="flex items-center gap-3"><Progress value={pct} label={`${s?.name} progress`} /><span className="text-xs font-bold">{pct}%</span></div></Td>
                      <Td className="font-bold">{e.grade !== undefined ? `${e.grade}%` : "—"}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
