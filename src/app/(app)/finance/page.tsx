"use client";

import { useState, type FormEvent } from "react";
import { Banknote, Plus, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useDb, userById } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { canRecordFinance } from "@/lib/auth/roles";
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from "@/lib/mock/seed";
import type { TransactionKind } from "@/lib/types";
import { formatDate, formatNaira, formatNairaCompact, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Pills, StatTile } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ColumnChart } from "@/components/charts/column-chart";
import { BarList } from "@/components/charts/bar-list";

export default function FinancePage() {
  const user = useCurrentUser();
  const canRecord = canRecordFinance(user.role);
  const { transactions, invoices, users, addTransaction } = useDb();
  const [kind, setKind] = useState<"all" | TransactionKind>("all");
  const [adding, setAdding] = useState<TransactionKind | null>(null);
  const [today] = useState(() => toDateKey(new Date()));

  const income = transactions.filter((t) => t.kind === "income");
  const expenses = transactions.filter((t) => t.kind === "expense");
  const revenue = income.reduce((a, t) => a + t.amount, 0);
  const spend = expenses.reduce((a, t) => a + t.amount, 0);
  const net = revenue - spend;
  const margin = revenue ? Math.round((net / revenue) * 100) : 0;

  const byCategory = (rows: typeof transactions) =>
    Object.entries(rows.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + t.amount }), {})).map(([label, value]) => ({ label, value }));

  const months = [...new Set(income.map((t) => t.date.slice(0, 7)))].sort().slice(-6);
  const monthly = months.map((m) => ({
    label: new Date(`${m}-01T00:00:00`).toLocaleDateString("en-NG", { month: "short" }),
    value: income.filter((t) => t.date.startsWith(m)).reduce((a, t) => a + t.amount, 0),
  }));

  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const shown = transactions.filter((t) => kind === "all" || t.kind === kind).sort((a, b) => b.date.localeCompare(a.date));

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!adding) return;
    const f = new FormData(e.currentTarget);
    addTransaction({
      kind: adding,
      amount: Number(f.get("amount")),
      category: String(f.get("category")),
      date: String(f.get("date")),
      description: String(f.get("description")),
    });
    setAdding(null);
  }

  return (
    <>
      <PageHeader
        title="Finance"
        description={canRecord ? "Year to date" : "Year to date · view only"}
        actions={
          canRecord && (
          <>
            <Button variant="secondary" onClick={() => setAdding("expense")}><TrendingDown className="size-4" /> Record expense</Button>
            <Button onClick={() => setAdding("income")}><Plus className="size-4" /> Record income</Button>
          </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Revenue" value={formatNairaCompact(revenue)} icon={TrendingUp} tone="mint" />
        <StatTile label="Expenses" value={formatNairaCompact(spend)} icon={TrendingDown} />
        <StatTile label="Net profit" value={formatNairaCompact(net)} icon={Wallet} />
        <StatTile label="Profit margin" value={`${margin}%`} icon={Banknote} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Monthly revenue" description={`Last ${monthly.length} months`} />
          <ColumnChart data={monthly} format={formatNairaCompact} caption="Revenue by month" />
        </Card>
        <Card>
          <CardHeader title="Revenue sources" />
          <BarList data={byCategory(income)} format={formatNairaCompact} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold">Transactions</h2>
            <Pills label="Transaction type" value={kind} onChange={setKind} options={[{ value: "all", label: "All" }, { value: "income", label: "Income" }, { value: "expense", label: "Expenses" }]} />
          </div>
          <Table>
            <THead>
              <tr><Th>Date</Th><Th>Description</Th><Th>Category</Th><Th className="text-right">Amount</Th></tr>
            </THead>
            <tbody>
              {shown.map((t) => (
                <Tr key={t.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDate(t.date)}</Td>
                  <Td className="font-semibold">{t.description}</Td>
                  <Td><Badge tone={t.kind === "income" ? "mint" : "neutral"}>{t.category}</Badge></Td>
                  <Td className="text-right font-extrabold whitespace-nowrap">
                    {t.kind === "income" ? "+" : "−"}{formatNaira(t.amount)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Expenses by category" />
            <BarList data={byCategory(expenses)} format={formatNairaCompact} />
          </Card>
          <Card>
            <CardHeader title="Invoices" description={`${formatNairaCompact(outstanding.reduce((a, i) => a + i.amount, 0))} outstanding`} />
            <ul className="space-y-2">
              {invoices.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <Receipt className="size-4 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold">{i.number}</p>
                    <p className="truncate text-xs text-muted">{userById(users, i.clientId)?.company} · due {formatDate(i.dueAt, { year: undefined })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold">{formatNairaCompact(i.amount)}</p>
                    <StatusBadge status={i.status} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={adding !== null} onClose={() => setAdding(null)} title={adding === "income" ? "Record income" : "Record expense"}>
        <form onSubmit={onAdd} className="space-y-4">
          <Field label="Amount (₦)" htmlFor="amount"><Input id="amount" name="amount" type="number" min={1} required /></Field>
          <Field label={adding === "income" ? "Source" : "Category"} htmlFor="category">
            <Select id="category" name="category">
              {(adding === "income" ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Date" htmlFor="date"><Input id="date" name="date" type="date" required defaultValue={today} /></Field>
          <Field label="Description" htmlFor="description"><Input id="description" name="description" required /></Field>
          <Button type="submit" className="w-full justify-center">Save</Button>
        </form>
      </Modal>
    </>
  );
}
