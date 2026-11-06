"use client";

import { useState, type FormEvent } from "react";
import { HandCoins, Hourglass, Paperclip, Plus, Upload, Wallet } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { visibleProjects } from "@/lib/access";
import { allowedDecisions, canAddReceipt, DECISION_LABELS, queueFor, STATUS_HINT } from "@/lib/fund-requests";
import { ACCOUNTANT_APPROVAL_LIMIT, EXPENSE_CATEGORIES } from "@/lib/mock/seed";
import { useDb, userById, type FileMeta, type FundRequestDecision } from "@/lib/store";
import type { FundRequest, User } from "@/lib/types";
import { cn, formatDate, formatNaira, formatNairaCompact, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState, PageHeader, Pills, StatTile } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";

type Tab = "queue" | "mine" | "all";

export default function FundRequestsPage() {
  const user = useCurrentUser();
  const { fundRequests, users, projects, submitFundRequest, decideFundRequest, attachToFundRequest } = useDb();
  const reviewer = user.role === "accountant" || user.role === "super_admin";
  const [tab, setTab] = useState<Tab>(reviewer ? "queue" : "mine");
  const [creating, setCreating] = useState(false);
  const [deciding, setDeciding] = useState<{ req: FundRequest; decision: FundRequestDecision } | null>(null);
  const [today] = useState(() => toDateKey(new Date()));

  const queue = queueFor(fundRequests, user);
  const mine = fundRequests.filter((r) => r.requesterId === user.id);
  const shown = (tab === "queue" ? queue : tab === "mine" ? mine : fundRequests)
    .slice()
    .sort((a, b) => (tab === "queue" ? 0 : b.createdAt.localeCompare(a.createdAt)));
  const sum = (rows: FundRequest[]) => rows.reduce((a, r) => a + r.amount, 0);

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    submitFundRequest(user.id, {
      title: String(f.get("title")),
      purpose: String(f.get("purpose")),
      amount: Number(f.get("amount")),
      category: String(f.get("category")),
      neededBy: String(f.get("neededBy")),
      projectId: String(f.get("projectId")) || undefined,
    }, toFileMeta(f.getAll("quotes")));
    setCreating(false);
    setTab("mine");
  }

  function onDecide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deciding) return;
    const note = String(new FormData(e.currentTarget).get("note")).trim();
    decideFundRequest(deciding.req.id, user.id, deciding.decision, note);
    setDeciding(null);
  }

  return (
    <>
      <PageHeader
        title="Fund requests"
        description={
          user.role === "accountant"
            ? `Review requests, approve those under ${formatNaira(ACCOUNTANT_APPROVAL_LIMIT)} yourself, forward larger ones to the super admin, and pay out approved ones.`
            : user.role === "super_admin"
              ? "Approve or reject requests the accountant has reviewed."
              : "Request money for work expenses. The accountant reviews it, then the super admin approves."
        }
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New request</Button>}
      />

      {reviewer && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatTile label="Waiting on you" value={String(queue.length)} icon={Hourglass} tone="mint" />
          <StatTile label="Value waiting on you" value={formatNairaCompact(sum(queue))} icon={HandCoins} />
          <StatTile label="Paid out (all time)" value={formatNairaCompact(sum(fundRequests.filter((r) => r.status === "disbursed")))} icon={Wallet} />
        </div>
      )}

      {reviewer && (
        <div className="mb-5">
          <Pills
            label="Fund request view"
            value={tab}
            onChange={setTab}
            options={[
              { value: "queue", label: "Needs your action", count: queue.length },
              { value: "mine", label: "My requests", count: mine.length },
              { value: "all", label: "All requests", count: fundRequests.length },
            ]}
          />
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={tab === "queue" ? "Nothing waiting on you" : "No fund requests yet"}
          description={tab === "queue" ? "New requests will show up here." : "Need money for work? Create a request and track it here."}
        />
      ) : (
        <ul className="space-y-4">
          {shown.map((r) => (
            <RequestCard
              key={r.id}
              req={r}
              users={users}
              projectName={projects.find((p) => p.id === r.projectId)?.name}
              showRequester={r.requesterId !== user.id}
              overdue={r.neededBy < today && !["disbursed", "rejected"].includes(r.status)}
              decisions={allowedDecisions(r, user)}
              onDecide={(decision) => setDeciding({ req: r, decision })}
              canAddReceipt={canAddReceipt(r, user)}
              onReceipts={(files) => attachToFundRequest(r.id, user.id, "receipt", files)}
            />
          ))}
        </ul>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New fund request">
        <form onSubmit={onCreate} className="space-y-4">
          <Field label="What is it for?" htmlFor="title"><Input id="title" name="title" required placeholder="e.g. Test devices for VFD app" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₦)" htmlFor="amount"><Input id="amount" name="amount" type="number" min={1} required /></Field>
            <Field label="Needed by" htmlFor="neededBy"><Input id="neededBy" name="neededBy" type="date" required min={today} defaultValue={today} /></Field>
            <Field label="Category" htmlFor="category">
              <Select id="category" name="category">
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Project" htmlFor="projectId">
              <Select id="projectId" name="projectId" defaultValue="">
                <option value="">None</option>
                {visibleProjects(projects, user).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Details" htmlFor="purpose" hint="Why it's needed, and any quotes or links the accountant should see.">
            <Textarea id="purpose" name="purpose" required />
          </Field>
          <Field label="Quotes or invoices (optional)" htmlFor="quotes" hint="PDFs or photos the accountant should see.">
            <input id="quotes" name="quotes" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-bold file:text-ink" />
          </Field>
          <Button type="submit" className="w-full justify-center">Send to accountant</Button>
        </form>
      </Modal>

      <Modal open={deciding !== null} onClose={() => setDeciding(null)} title={deciding ? `${DECISION_LABELS[deciding.decision]}: ${deciding.req.title}` : ""}>
        {deciding && (
          <form onSubmit={onDecide} className="space-y-4">
            <p className="text-sm text-muted">
              {formatNaira(deciding.req.amount)} for {userById(users, deciding.req.requesterId)?.name}.
              {deciding.decision === "disbursed" && " This records the payment as an expense in Finance."}
            </p>
            <Field
              label={deciding.decision === "rejected" ? "Reason" : "Note (optional)"}
              htmlFor="note"
              hint={deciding.decision === "rejected" ? "The requester will see this." : undefined}
            >
              <Textarea id="note" name="note" required={deciding.decision === "rejected"} />
            </Field>
            <Button type="submit" variant={deciding.decision === "rejected" ? "danger" : "primary"} className="w-full justify-center">
              {DECISION_LABELS[deciding.decision]}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

const ACTION_TEXT: Record<FundRequest["history"][number]["action"], string> = {
  submitted: "submitted the request",
  forwarded: "forwarded it to the super admin",
  approved: "approved it",
  rejected: "rejected it",
  disbursed: "paid it out",
};

/** Mock upload: keep name and size only. The API will use presigned uploads to object storage. */
function toFileMeta(entries: FormDataEntryValue[] | FileList | null): FileMeta[] {
  return Array.from(entries ?? [])
    .filter((f): f is File => f instanceof File && f.size > 0)
    .map((f) => ({ name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)) }));
}

function RequestCard({
  req,
  users,
  projectName,
  showRequester,
  overdue,
  decisions,
  onDecide,
  canAddReceipt,
  onReceipts,
}: {
  req: FundRequest;
  users: User[];
  projectName?: string;
  showRequester: boolean;
  overdue: boolean;
  decisions: FundRequestDecision[];
  onDecide: (d: FundRequestDecision) => void;
  canAddReceipt: boolean;
  onReceipts: (files: FileMeta[]) => void;
}) {
  const requester = userById(users, req.requesterId);
  return (
    <li>
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold">{req.title}</h2>
              <StatusBadge status={req.status} />
            </div>
            <p className="mt-1 text-sm text-muted">{STATUS_HINT[req.status]}</p>
          </div>
          <p className="text-2xl font-extrabold whitespace-nowrap">{formatNaira(req.amount)}</p>
        </div>

        <p className="mt-3 text-sm">{req.purpose}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {showRequester && requester && (
            <span className="flex items-center gap-2 font-bold">
              <Avatar name={requester.name} size="sm" /> {requester.name}
            </span>
          )}
          <Badge>{req.category}</Badge>
          {projectName && <Badge tone="mint">{projectName}</Badge>}
          <span className={cn("text-xs font-semibold", overdue ? "text-red-700" : "text-muted")}>
            Needed by {formatDate(req.neededBy)}
          </span>
        </div>

        {(req.attachments.length > 0 || canAddReceipt) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {req.attachments.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold">
                <Paperclip className="size-3.5 text-muted" aria-hidden />
                <span className="text-muted">{a.kind === "quote" ? "Quote" : "Receipt"}:</span> {a.name}
              </span>
            ))}
            {canAddReceipt && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-xs font-bold hover:bg-mint-soft">
                <Upload className="size-3.5" aria-hidden /> Upload receipt
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    onReceipts(toFileMeta(e.target.files));
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        )}

        <details className="group mt-4">
          <summary className="cursor-pointer list-none text-xs font-bold text-muted marker:hidden hover:text-ink">
            History ({req.history.length}) <span className="inline-block transition-transform group-open:rotate-90">›</span>
          </summary>
          <ol className="mt-3 space-y-2 rounded-2xl bg-canvas p-4">
            {req.history.map((h, i) => (
              <li key={i} className="text-sm">
                <span className="font-bold">{userById(users, h.actorId)?.name ?? "Someone"}</span> {ACTION_TEXT[h.action]}
                <span className="text-xs text-muted"> · {formatDate(h.at)}</span>
                {h.note && <p className="mt-0.5 text-xs text-muted">“{h.note}”</p>}
              </li>
            ))}
          </ol>
        </details>

        {decisions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {decisions.map((d) => (
              <Button key={d} size="sm" variant={d === "rejected" ? "danger" : "primary"} onClick={() => onDecide(d)}>
                {DECISION_LABELS[d]}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </li>
  );
}
