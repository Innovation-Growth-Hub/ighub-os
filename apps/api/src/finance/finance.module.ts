import { randomUUID } from "node:crypto";
import { Body, ConflictException, Controller, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { invoices, transactions } from "@ighub/db";
import {
  canRecordFinance,
  createInvoiceSchema,
  createTransactionSchema,
  FINANCE,
  invoiceStatusSchema,
  type CreateInvoiceInput,
  type CreateTransactionInput,
  type Invoice,
  type InvoiceStatus,
  type Role,
  type Transaction,
} from "@ighub/shared";
import { AllowRoles, CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { ActivityService } from "../common/activity.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB, type Database } from "../db/db.module.js";

const seesFinance = (r: Role) => FINANCE.includes(r);

/** Books: super admin + accountant record; admin views. */
@Injectable()
export class FinanceService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly activity: ActivityService,
  ) {}

  async transactions(): Promise<Transaction[]> {
    const rows = await this.db.select().from(transactions).orderBy(desc(transactions.date), desc(transactions.createdAt));
    return rows.map((r) => ({ id: r.id, kind: r.kind, amount: Number(r.amount), category: r.category, date: r.date, description: r.description }));
  }

  async addTransaction(input: CreateTransactionInput, user: AuthUser) {
    const id = randomUUID();
    await this.db.insert(transactions).values({ id, ...input, recordedBy: user.id });
    await this.activity.record(user.id, `recorded ${input.kind === "income" ? "income" : "an expense"}: ${input.description}`);
    return (await this.transactions()).find((t) => t.id === id);
  }

  async invoices(): Promise<Invoice[]> {
    const rows = await this.db.select().from(invoices).orderBy(desc(invoices.issuedAt));
    return rows.map((r) => ({
      id: r.id,
      number: r.number,
      contactId: r.contactId ?? undefined,
      clientName: r.clientName,
      amount: Number(r.amount),
      issuedAt: r.issuedAt,
      dueAt: r.dueAt,
      status: r.status,
    }));
  }

  async addInvoice(input: CreateInvoiceInput) {
    const [dup] = await this.db.select({ id: invoices.id }).from(invoices).where(eq(invoices.number, input.number)).limit(1);
    if (dup) throw new ConflictException({ code: "invoice_number_taken", message: `Invoice ${input.number} already exists.` });
    const id = randomUUID();
    await this.db.insert(invoices).values({ id, ...input, contactId: input.contactId ?? null });
    return (await this.invoices()).find((i) => i.id === id);
  }

  async setInvoiceStatus(id: string, status: InvoiceStatus) {
    const res = await this.db.update(invoices).set({ status }).where(eq(invoices.id, id));
    if (!res[0].affectedRows) throw new NotFoundException({ code: "invoice_not_found", message: "Invoice not found." });
    return (await this.invoices()).find((i) => i.id === id);
  }
}

@Controller("finance")
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("transactions")
  @AllowRoles(seesFinance)
  list() {
    return this.finance.transactions();
  }

  @Post("transactions")
  @AllowRoles(canRecordFinance)
  add(@Body(new ZodPipe(createTransactionSchema)) body: CreateTransactionInput, @CurrentUser() user: AuthUser) {
    return this.finance.addTransaction(body, user);
  }

  @Get("invoices")
  @AllowRoles(seesFinance)
  invoices() {
    return this.finance.invoices();
  }

  @Post("invoices")
  @AllowRoles(canRecordFinance)
  addInvoice(@Body(new ZodPipe(createInvoiceSchema)) body: CreateInvoiceInput) {
    return this.finance.addInvoice(body);
  }

  @Patch("invoices/:id/status")
  @AllowRoles(canRecordFinance)
  invoiceStatus(@Param("id") id: string, @Body(new ZodPipe(invoiceStatusSchema)) body: { status: InvoiceStatus }) {
    return this.finance.setInvoiceStatus(id, body.status);
  }
}

@Module({ controllers: [FinanceController], providers: [FinanceService] })
export class FinanceModule {}
