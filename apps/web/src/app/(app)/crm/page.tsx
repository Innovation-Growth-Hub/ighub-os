"use client";

import { useState, type FormEvent } from "react";
import { Mail, MessageSquare, Phone, Plus, Search, Users, Video } from "lucide-react";
import { useDb } from "@/lib/store";
import type { Communication, Contact } from "@ighub/shared";
import { cn, formatDate, formatNairaCompact } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState, PageHeader, Pills } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { CrmTabs } from "@/components/crm/crm-tabs";

type Segment = Contact["segment"];
const SEGMENTS: Record<Segment, string> = { corporate: "Corporate", government: "Government", startup: "Startup", ngo: "NGO" };
const COMM_ICON = { call: Phone, email: Mail, meeting: Video };

export default function CrmContactsPage() {
  const { contacts, deals, communications, addContact, addCommunication } = useDb();
  const [segment, setSegment] = useState<"all" | Segment>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(contacts[0]?.id ?? null);
  const [adding, setAdding] = useState(false);

  const shown = contacts
    .filter((c) => segment === "all" || c.segment === segment)
    .filter((c) => `${c.name} ${c.company} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
  const selected = contacts.find((c) => c.id === selectedId);
  const log = communications.filter((c) => c.contactId === selectedId).sort((a, b) => b.at.localeCompare(a.at));
  const contactDeals = deals.filter((d) => d.contactId === selectedId);

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    addContact({
      name: String(f.get("name")),
      email: String(f.get("email")),
      phone: String(f.get("phone")),
      company: String(f.get("company")),
      position: String(f.get("position")),
      segment: f.get("segment") as Segment,
    });
    setAdding(false);
  }

  function onLog(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    const f = new FormData(e.currentTarget);
    addCommunication({ contactId: selectedId, type: f.get("type") as Communication["type"], summary: String(f.get("summary")) });
    e.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="CRM" description="Clients, partners and every conversation with them." actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add contact</Button>} />
      <CrmTabs />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Pills
              label="Segment"
              value={segment}
              onChange={setSegment}
              options={[{ value: "all", label: "All" }, ...Object.entries(SEGMENTS).map(([value, label]) => ({ value: value as Segment, label }))]}
            />
            <label className="relative lg:w-60">
              <span className="sr-only">Search contacts</span>
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="rounded-full bg-canvas pl-11" />
            </label>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={Users} title="No contacts found" />
          ) : (
            <ul className="space-y-2">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    aria-pressed={c.id === selectedId}
                    className={cn("flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors", c.id === selectedId ? "bg-mint" : "bg-canvas hover:bg-mint-soft")}
                  >
                    <Avatar name={c.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{c.name}</p>
                      <p className="truncate text-xs text-muted">{c.position} · {c.company}</p>
                    </div>
                    <Badge>{SEGMENTS[c.segment]}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-2">
          {selected ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} size="lg" />
                <div>
                  <p className="text-lg font-extrabold">{selected.name}</p>
                  <p className="text-sm text-muted">{selected.position} · {selected.company}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p className="flex items-center gap-2"><Mail className="size-4 text-muted" />{selected.email}</p>
                <p className="flex items-center gap-2"><Phone className="size-4 text-muted" />{selected.phone}</p>
              </div>
              {contactDeals.length > 0 && (
                <div className="mt-5 space-y-2">
                  {contactDeals.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-2.5 text-sm">
                      <span className="font-bold">{d.name}</span>
                      <span className="text-muted">{formatNairaCompact(d.value)} · {d.stage}</span>
                    </div>
                  ))}
                </div>
              )}
              <CardHeader title="Communication history" className="mt-6 mb-3" />
              <form onSubmit={onLog} className="mb-4 space-y-2 rounded-2xl bg-canvas p-3">
                <div className="flex gap-2">
                  <label className="w-32">
                    <span className="sr-only">Type</span>
                    <Select name="type" defaultValue="call" className="h-9">
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                    </Select>
                  </label>
                  <label className="flex-1">
                    <span className="sr-only">Summary</span>
                    <Input name="summary" required placeholder="What was discussed?" className="h-9" />
                  </label>
                  <Button type="submit" size="sm">Log</Button>
                </div>
              </form>
              <ol className="space-y-3">
                {log.map((c) => {
                  const Icon = COMM_ICON[c.type];
                  return (
                    <li key={c.id} className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas"><Icon className="size-4 text-primary-ink" aria-label={c.type} /></span>
                      <div className="text-sm">
                        <p>{c.summary}</p>
                        <p className="text-xs text-muted">{formatDate(c.at)}</p>
                      </div>
                    </li>
                  );
                })}
                {log.length === 0 && <p className="flex items-center gap-2 text-sm text-muted"><MessageSquare className="size-4" /> No conversations logged yet.</p>}
              </ol>
            </>
          ) : (
            <p className="text-sm text-muted">Select a contact.</p>
          )}
        </Card>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add contact">
        <form onSubmit={onAdd} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="c-name"><Input id="c-name" name="name" required /></Field>
            <Field label="Email" htmlFor="c-email"><Input id="c-email" name="email" type="email" required /></Field>
            <Field label="Phone" htmlFor="c-phone"><Input id="c-phone" name="phone" type="tel" /></Field>
            <Field label="Company" htmlFor="c-company"><Input id="c-company" name="company" required /></Field>
            <Field label="Position" htmlFor="c-position"><Input id="c-position" name="position" /></Field>
            <Field label="Segment" htmlFor="c-segment">
              <Select id="c-segment" name="segment">
                {Object.entries(SEGMENTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Button type="submit" className="w-full justify-center">Save contact</Button>
        </form>
      </Modal>
    </>
  );
}
