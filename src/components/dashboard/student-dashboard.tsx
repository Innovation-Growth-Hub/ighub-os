"use client";

import Link from "next/link";
import { BookOpen, Flame, GraduationCap } from "lucide-react";
import { courseProgress, useDb, userById } from "@/lib/store";
import type { User } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Progress, StatTile } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";

export function StudentDashboard({ user }: { user: User }) {
  const { courses, enrollments, users } = useDb();
  const mine = enrollments.filter((e) => e.userId === user.id);
  const lessonsDone = mine.reduce((a, e) => a + e.completedLessonIds.length, 0);
  const graded = mine.filter((e) => e.grade !== undefined);
  const avgGrade = graded.length ? Math.round(graded.reduce((a, e) => a + (e.grade ?? 0), 0) / graded.length) : null;

  if (!mine.length) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="You're not enrolled in a course yet"
        description="Browse the catalogue and join a programme."
        action={<LinkButton href="/lms">Browse courses</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Courses" value={String(mine.length)} icon={GraduationCap} tone="mint" />
        <StatTile label="Lessons completed" value={String(lessonsDone)} icon={BookOpen} />
        <StatTile label="Average grade" value={avgGrade === null ? "—" : `${avgGrade}%`} icon={Flame} />
      </div>
      <Card>
        <CardHeader title="Continue learning" />
        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((e) => {
            const c = courses.find((x) => x.id === e.courseId);
            if (!c) return null;
            const pct = courseProgress(c, e);
            const next = c.lessons.find((l) => !e.completedLessonIds.includes(l.id));
            return (
              <Link key={e.id} href={`/lms/${c.id}`} className="rounded-3xl bg-canvas p-5 hover:bg-mint-soft">
                <p className="text-xs font-bold text-muted">{c.category} · {userById(users, c.trainerId)?.name}</p>
                <p className="mt-1 text-lg font-extrabold">{c.title}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted">{next ? `Next: ${next.title}` : "All lessons complete 🎉"}</span>
                  <span className="font-extrabold">{pct}%</span>
                </div>
                <Progress value={pct} className="mt-2" label={`${c.title} progress`} />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
