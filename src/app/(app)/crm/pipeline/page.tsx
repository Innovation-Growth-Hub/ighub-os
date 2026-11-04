"use client";

import { useState, type DragEvent } from "react";
import { useDb } from "@/lib/store";
import type { DealStage } from "@/lib/types";
import { cn, formatNairaCompact } from "@/lib/utils";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { CrmTabs } from "@/components/crm/crm-tabs";

const STAGES: Array<{ id: DealStage; label: string }> = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export default function PipelinePage() {
  const { deals, contacts, moveDeal } = useDb();
  const [over, setOver] = useState<DealStage | null>(null);
  const open = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const weighted = open.reduce((a, d) => a + (d.value * d.probability) / 100, 0);
  const won = deals.filter((d) => d.stage === "won").reduce((a, d) => a + d.value, 0);
  const closed = deals.filter((d) => ["won", "lost"].includes(d.stage));
  const winRate = closed.length ? Math.round((deals.filter((d) => d.stage === "won").length / closed.length) * 100) : 0;

  function onDrop(e: DragEvent, stage: DealStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveDeal(id, stage);
    setOver(null);
  }

  return (
    <>
      <PageHeader title="CRM" description="Drag deals between stages, or use each card's stage menu." />
      <CrmTabs />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Open pipeline" value={formatNairaCompact(open.reduce((a, d) => a + d.value, 0))} tone="mint" />
        <StatTile label="Weighted forecast" value={formatNairaCompact(weighted)} />
        <StatTile label={`Won · ${winRate}% win rate`} value={formatNairaCompact(won)} />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const items = deals.filter((d) => d.stage === s.id);
          return (
            <section
              key={s.id}
              aria-label={s.label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => onDrop(e, s.id)}
              className={cn("w-72 shrink-0 rounded-3xl p-4", over === s.id ? "bg-mint-soft" : "bg-surface")}
            >
              <div className="mb-3 px-1">
                <p className="font-extrabold">{s.label} <span className="text-sm text-muted">{items.length}</span></p>
                <p className="text-xs font-semibold text-muted">{formatNairaCompact(items.reduce((a, d) => a + d.value, 0))}</p>
              </div>
              <ul className="space-y-2">
                {items.map((d) => {
                  const c = contacts.find((x) => x.id === d.contactId);
                  return (
                    <li key={d.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)} className="cursor-grab rounded-2xl bg-canvas p-4">
                      <p className="text-sm font-bold">{d.name}</p>
                      <p className="text-xs text-muted">{c?.company}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-extrabold">{formatNairaCompact(d.value)}</span>
                        <span className="text-xs font-semibold text-muted">{d.probability}%</span>
                      </div>
                      <label className="mt-2 block">
                        <span className="sr-only">Stage for {d.name}</span>
                        <select value={d.stage} onChange={(e) => moveDeal(d.id, e.target.value as DealStage)} className="h-8 w-full rounded-full bg-surface-2 px-3 text-xs font-bold">
                          {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                        </select>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
