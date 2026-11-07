"use client";

import Link from "next/link";
import { AlertTriangle, FileUp, Lightbulb, Sparkles, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { computePenalties, projectProgress, useDb } from "@/lib/store";
import { attendanceDates, workers } from "@/lib/attendance";
import { formatNairaCompact } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Badge, type Tone } from "@/components/ui/badge";

interface Insight {
  icon: LucideIcon;
  tone: Tone;
  kind: string;
  title: string;
  body: string;
  href: string;
}

/**
 * Preview: insights are computed by simple rules over the mock data.
 * Phase 4 replaces `buildInsights` with a server call to an LLM (Claude API)
 * that receives the same aggregates and returns ranked recommendations.
 */
function useInsights(): Insight[] {
  const { users, attendance, lateRequests, deals, projects, transactions, invoices } = useDb();
  const out: Insight[] = [];
  const recent = new Set(attendanceDates(attendance).slice(0, 20));

  // Punctuality risk
  for (const u of workers(users)) {
    const rows = attendance.filter((a) => a.userId === u.id && recent.has(a.date));
    const lateRate = rows.length ? rows.filter((a) => a.status === "late").length / rows.length : 0;
    if (lateRate >= 0.3) {
      out.push({ icon: AlertTriangle, tone: "warning", kind: "People", title: `${u.name} is late ${Math.round(lateRate * 100)}% of the time`, body: "Consider a check-in about commute or schedule. A 9:30 start for this role may reduce penalties without hurting output.", href: `/staff/${u.id}` });
    }
  }
  const penalties = computePenalties(attendance, lateRequests);
  if (penalties.length) {
    out.push({ icon: Target, tone: "info", kind: "People", title: `${penalties.length} penalty weeks recorded`, body: `That's ${formatNairaCompact(penalties.reduce((a, p) => a + p.amount, 0))} in penalties. Most come from a small group, so targeted support beats a blanket policy change.`, href: "/reports" });
  }

  // Revenue concentration
  const income = transactions.filter((t) => t.kind === "income");
  const total = income.reduce((a, t) => a + t.amount, 0);
  const training = income.filter((t) => t.category === "Training Programs").reduce((a, t) => a + t.amount, 0);
  if (total && training / total > 0.35) {
    out.push({ icon: TrendingUp, tone: "good", kind: "Growth", title: `Training drives ${Math.round((training / total) * 100)}% of revenue`, body: "Corporate training converts well (Swiftpay). Packaging the bootcamp curriculum as a B2B offer is the fastest growth lever.", href: "/finance" });
  }

  // Pipeline
  const hot = deals.filter((d) => ["proposal", "negotiation"].includes(d.stage));
  if (hot.length) {
    out.push({ icon: Lightbulb, tone: "mint", kind: "Sales", title: `${formatNairaCompact(hot.reduce((a, d) => a + d.value, 0))} is in late-stage deals`, body: `${hot.map((d) => d.name).join(", ")}. Prioritise follow-ups on these this week.`, href: "/crm/pipeline" });
  }

  // Overdue invoices
  const overdue = invoices.filter((i) => i.status === "overdue");
  if (overdue.length) {
    out.push({ icon: AlertTriangle, tone: "critical", kind: "Finance", title: `${overdue.length} overdue invoice(s) worth ${formatNairaCompact(overdue.reduce((a, i) => a + i.amount, 0))}`, body: "Government clients pay slower. Consider milestone-based invoicing with shorter terms on the e-Gov payments extension.", href: "/finance" });
  }

  // Budget burn vs progress
  for (const p of projects.filter((x) => x.status === "active")) {
    const burn = p.budget ? (p.spent / p.budget) * 100 : 0;
    const prog = projectProgress(p);
    if (burn - prog > 10) {
      out.push({ icon: AlertTriangle, tone: "warning", kind: "Projects", title: `${p.name}: budget ahead of delivery`, body: `${Math.round(burn)}% of budget used vs ${prog}% of milestones delivered. Review scope before the next milestone.`, href: `/projects/${p.id}` });
    }
  }
  return out;
}

export default function InsightsPage() {
  const insights = useInsights();
  return (
    <>
      <PageHeader title="AI Insights" description="Recommendations from your hub's data" />
      <Card tone="mint" className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-canvas"><Sparkles className="size-6 text-primary-ink" aria-hidden /></span>
        <div>
          <p className="font-extrabold">Preview mode</p>
          <p className="text-sm text-ink/80">These insights come from simple rules over mock data. The AI model, predictive analytics and document analysis connect in Phase 4.</p>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((i) => (
          <Link key={i.title} href={i.href} className="flex gap-4 rounded-3xl bg-surface p-6 transition-colors hover:bg-surface-2">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-canvas"><i.icon className="size-5 text-primary-ink" aria-hidden /></span>
            <div>
              <Badge tone={i.tone}>{i.kind}</Badge>
              <p className="mt-2 font-extrabold">{i.title}</p>
              <p className="mt-1 text-sm text-muted">{i.body}</p>
            </div>
          </Link>
        ))}
        <div className="flex flex-col items-center justify-center rounded-3xl bg-surface-2 p-6 text-center">
          <FileUp className="size-8 text-muted" aria-hidden />
          <p className="mt-2 font-extrabold">Training document analysis</p>
          <p className="text-sm text-muted">Upload a curriculum to get gap analysis and suggested lessons. Arrives in Phase 4.</p>
        </div>
      </div>
    </>
  );
}
