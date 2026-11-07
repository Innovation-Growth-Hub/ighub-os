import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { asc, desc, eq } from "drizzle-orm";
import { communications, contacts, deals } from "@ighub/db";
import {
  createCommunicationSchema,
  createContactSchema,
  createDealSchema,
  isAdmin,
  moveDealSchema,
  type Communication,
  type Contact,
  type CreateCommunicationInput,
  type CreateContactInput,
  type CreateDealInput,
  type Deal,
  type DealStage,
  type Role,
} from "@ighub/shared";
import { AllowRoles, CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { ActivityService } from "../common/activity.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB, type Database } from "../db/db.module.js";

/** Same rule as the web route table: admins and project managers. */
const usesCrm = (r: Role) => isAdmin(r) || r === "project_manager";

@Injectable()
export class CrmService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly activity: ActivityService,
  ) {}

  async contacts(): Promise<Contact[]> {
    const rows = await this.db.select().from(contacts).orderBy(asc(contacts.company), asc(contacts.name));
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      position: c.position,
      segment: c.segment,
      lastContactedAt: c.lastContactedAt.toISOString(),
    }));
  }

  async addContact(input: CreateContactInput, user: AuthUser) {
    const id = randomUUID();
    await this.db.insert(contacts).values({ id, ...input });
    await this.activity.record(user.id, `added ${input.name} (${input.company}) to the CRM`);
    return (await this.contacts()).find((c) => c.id === id);
  }

  async deals(): Promise<Deal[]> {
    const rows = await this.db.select().from(deals).orderBy(desc(deals.createdAt));
    return rows.map((d) => ({ id: d.id, name: d.name, contactId: d.contactId, stage: d.stage, value: Number(d.value), probability: d.probability }));
  }

  async addDeal(input: CreateDealInput, user: AuthUser) {
    const id = randomUUID();
    await this.db.insert(deals).values({ id, ...input });
    await this.activity.record(user.id, `opened the deal “${input.name}”`);
    return (await this.deals()).find((d) => d.id === id);
  }

  async moveDeal(id: string, stage: DealStage, user: AuthUser) {
    const deal = (await this.deals()).find((d) => d.id === id);
    if (!deal) throw new NotFoundException({ code: "deal_not_found", message: "Deal not found." });
    const probability = stage === "won" ? 100 : stage === "lost" ? 0 : deal.probability;
    await this.db.update(deals).set({ stage, probability }).where(eq(deals.id, id));
    if (stage === "won" || stage === "lost") await this.activity.record(user.id, `marked “${deal.name}” as ${stage}`);
    return { ...deal, stage, probability };
  }

  async communications(): Promise<Communication[]> {
    const rows = await this.db.select().from(communications).orderBy(desc(communications.at));
    return rows.map((c) => ({ id: c.id, contactId: c.contactId, type: c.type, summary: c.summary, at: c.at.toISOString() }));
  }

  async addCommunication(input: CreateCommunicationInput, user: AuthUser) {
    const id = randomUUID();
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx.insert(communications).values({ id, ...input, loggedBy: user.id, at: now });
      await tx.update(contacts).set({ lastContactedAt: now }).where(eq(contacts.id, input.contactId));
    });
    return (await this.communications()).find((c) => c.id === id);
  }
}

@Controller("crm")
@AllowRoles(usesCrm)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("contacts")
  contacts() {
    return this.crm.contacts();
  }

  @Post("contacts")
  addContact(@Body(new ZodPipe(createContactSchema)) body: CreateContactInput, @CurrentUser() user: AuthUser) {
    return this.crm.addContact(body, user);
  }

  @Get("deals")
  deals() {
    return this.crm.deals();
  }

  @Post("deals")
  addDeal(@Body(new ZodPipe(createDealSchema)) body: CreateDealInput, @CurrentUser() user: AuthUser) {
    return this.crm.addDeal(body, user);
  }

  @Patch("deals/:id/stage")
  moveDeal(@Param("id") id: string, @Body(new ZodPipe(moveDealSchema)) body: { stage: DealStage }, @CurrentUser() user: AuthUser) {
    return this.crm.moveDeal(id, body.stage, user);
  }

  @Get("communications")
  communications() {
    return this.crm.communications();
  }

  @Post("communications")
  addCommunication(@Body(new ZodPipe(createCommunicationSchema)) body: CreateCommunicationInput, @CurrentUser() user: AuthUser) {
    return this.crm.addCommunication(body, user);
  }
}

@Module({ controllers: [CrmController], providers: [CrmService] })
export class CrmModule {}
