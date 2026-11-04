"use client";

import { useState, type FormEvent } from "react";
import { AtSign, CalendarClock, Globe, Heart, Plus, Repeat2, Send, Users } from "lucide-react";
import { useDb } from "@/lib/store";
import type { SocialPlatform } from "@/lib/types";
import { formatTime, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Pills } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { BarList } from "@/components/charts/bar-list";

// lucide v1 ships no brand logos; platforms are identified by name, never colour alone.
const PLATFORM: Record<SocialPlatform, { label: string; icon: typeof Globe }> = {
  instagram: { label: "Instagram", icon: AtSign },
  x: { label: "X", icon: AtSign },
  linkedin: { label: "LinkedIn", icon: Users },
  facebook: { label: "Facebook", icon: Globe },
};

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export default function SocialPage() {
  const { socialAccounts, socialPosts, schedulePost } = useDb();
  const [view, setView] = useState<"scheduled" | "published">("scheduled");
  const [composing, setComposing] = useState(false);
  const [now] = useState(() => new Date().toISOString());
  const [today] = useState(() => toDateKey(new Date()));

  const account = (id: string) => socialAccounts.find((a) => a.id === id);
  const scheduled = socialPosts.filter((p) => !p.publishedAt).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const published = socialPosts.filter((p) => p.publishedAt).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
  const engagement = socialAccounts.map((a) => ({
    label: PLATFORM[a.platform].label,
    value: published.filter((p) => p.accountId === a.id).reduce((s, p) => s + (p.likes ?? 0) + (p.shares ?? 0), 0),
  }));

  function onCompose(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    for (const accountId of f.getAll("accounts")) {
      schedulePost({ accountId: String(accountId), content: String(f.get("content")), scheduledAt: `${f.get("date")}T${f.get("time")}:00` });
    }
    setComposing(false);
  }

  const list = view === "scheduled" ? scheduled : published;

  return (
    <>
      <PageHeader title="Social media" description="Schedule posts across IGHub's accounts" actions={<Button onClick={() => setComposing(true)}><Plus className="size-4" /> New post</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {socialAccounts.map((a) => {
          const P = PLATFORM[a.platform];
          return (
            <div key={a.id} className="rounded-3xl bg-surface p-6">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="flex size-8 items-center justify-center rounded-full bg-canvas"><P.icon className="size-4 text-primary-ink" aria-hidden /></span>
                {P.label}
              </div>
              <p className="mt-3 text-3xl font-extrabold">{compact(a.followers)}</p>
              <p className="text-xs text-muted">followers · {a.handle}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold">Content calendar</h2>
            <Pills label="Post status" value={view} onChange={setView} options={[{ value: "scheduled", label: "Scheduled", count: scheduled.length }, { value: "published", label: "Published", count: published.length }]} />
          </div>
          <ul className="space-y-2">
            {list.map((p) => {
              const a = account(p.accountId);
              const P = a ? PLATFORM[a.platform] : null;
              const when = p.publishedAt ?? p.scheduledAt;
              return (
                <li key={p.id} className="flex gap-4 rounded-3xl bg-canvas p-4">
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-xs font-bold text-muted uppercase">{new Date(when).toLocaleDateString("en-NG", { month: "short" })}</p>
                    <p className="text-2xl leading-none font-extrabold">{new Date(when).getDate()}</p>
                    <p className="text-[11px] text-muted">{formatTime(when)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {P && <Badge icon={P.icon}>{P.label}</Badge>}
                      {!p.publishedAt && p.scheduledAt < now.slice(0, 19) && <Badge tone="warning">Awaiting publish</Badge>}
                    </div>
                    <p className="mt-2 text-sm">{p.content}</p>
                    {p.publishedAt && (
                      <p className="mt-2 flex gap-4 text-xs font-bold text-muted">
                        <span className="flex items-center gap-1"><Heart className="size-3.5" />{compact(p.likes ?? 0)}</span>
                        <span className="flex items-center gap-1"><Repeat2 className="size-3.5" />{compact(p.shares ?? 0)}</span>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Engagement by platform" description="Likes + shares on published posts" />
            <BarList data={engagement} format={compact} />
          </Card>
          <Card tone="mint">
            <CalendarClock className="size-6 text-primary-ink" aria-hidden />
            <p className="mt-3 font-extrabold">Auto-publishing arrives with the backend</p>
            <p className="mt-1 text-sm text-ink/80">For now, scheduled posts are tracked here and published by hand.</p>
          </Card>
        </div>
      </div>

      <Modal open={composing} onClose={() => setComposing(false)} title="New post">
        <form onSubmit={onCompose} className="space-y-4">
          <Field label="Post" htmlFor="content"><Textarea id="content" name="content" required maxLength={2200} className="min-h-32" /></Field>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Accounts</legend>
            <div className="flex flex-wrap gap-2">
              {socialAccounts.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-bold has-checked:bg-mint">
                  <input type="checkbox" name="accounts" value={a.id} defaultChecked={a.platform === "instagram"} className="size-4 rounded-xl accent-primary" />
                  {PLATFORM[a.platform].label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="date"><Input id="date" name="date" type="date" required defaultValue={today} min={today} /></Field>
            <Field label="Time" htmlFor="time"><Input id="time" name="time" type="time" required defaultValue="12:00" /></Field>
          </div>
          <Button type="submit" className="w-full justify-center"><Send className="size-4" /> Schedule</Button>
        </form>
      </Modal>
    </>
  );
}
