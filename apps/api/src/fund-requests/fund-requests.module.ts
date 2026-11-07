import { randomUUID } from "node:crypto";
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { files, fundRequestAttachments, fundRequestEvents, fundRequests, transactions } from "@ighub/db";
import {
  allowedDecisions,
  canAddReceipt,
  createFundRequestSchema,
  decideFundRequestSchema,
  type CreateFundRequestInput,
  type DecideFundRequestInput,
  type FundRequest,
} from "@ighub/shared";
import { CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { ActivityService } from "../common/activity.service.js";
import { lagosToday } from "../common/clock.js";
import { MAX_UPLOAD_BYTES, sizeKb, StorageService, type UploadedFile } from "../common/storage.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB, type Database } from "../db/db.module.js";
import { ProjectsModule } from "../projects/projects.controller.js";
import { asUser, ProjectsService } from "../projects/projects.service.js";

const isReviewer = (u: AuthUser) => u.role === "accountant" || u.role === "super_admin";
const upload = (field: string) => FilesInterceptor(field, 5, { limits: { fileSize: MAX_UPLOAD_BYTES } });

/**
 * staff submit → accountant forwards/rejects (or approves under ₦50k) → super admin
 * approves/rejects → accountant pays out (which books the expense). Rules: shared/fund-requests.ts.
 */
@Injectable()
export class FundRequestsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: StorageService,
    private readonly projects: ProjectsService,
    private readonly activity: ActivityService,
  ) {}

  private async load(ids?: string[]): Promise<FundRequest[]> {
    const where = ids ? inArray(fundRequests.id, ids) : undefined;
    const rows = await this.db.select().from(fundRequests).where(where).orderBy(desc(fundRequests.createdAt));
    if (!rows.length) return [];
    const reqIds = rows.map((r) => r.id);
    const [events, atts] = await Promise.all([
      this.db.select().from(fundRequestEvents).where(inArray(fundRequestEvents.requestId, reqIds)).orderBy(asc(fundRequestEvents.at)),
      this.db
        .select({ a: fundRequestAttachments, f: files })
        .from(fundRequestAttachments)
        .innerJoin(files, eq(files.id, fundRequestAttachments.fileId))
        .where(inArray(fundRequestAttachments.requestId, reqIds)),
    ]);
    return rows.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      title: r.title,
      purpose: r.purpose,
      amount: Number(r.amount),
      category: r.category,
      neededBy: r.neededBy,
      projectId: r.projectId ?? undefined,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      history: events
        .filter((e) => e.requestId === r.id)
        .map((e) => ({ at: e.at.toISOString(), actorId: e.actorId, action: e.action, note: e.note ?? undefined })),
      attachments: atts
        .filter((x) => x.a.requestId === r.id)
        .map((x) => ({
          id: x.a.id,
          kind: x.a.kind,
          name: x.f.originalName,
          sizeKb: sizeKb(x.f.sizeBytes),
          uploadedBy: x.f.uploadedBy,
          uploadedAt: x.f.createdAt.toISOString(),
        })),
    }));
  }

  async list(user: AuthUser) {
    const all = await this.load();
    return isReviewer(user) ? all : all.filter((r) => r.requesterId === user.id);
  }

  async get(id: string, user: AuthUser) {
    const [req] = await this.load([id]);
    if (!req || (!isReviewer(user) && req.requesterId !== user.id)) {
      throw new NotFoundException({ code: "fund_request_not_found", message: "Fund request not found." });
    }
    return req;
  }

  private async attach(requestId: string, kind: "quote" | "receipt", uploads: UploadedFile[], user: AuthUser) {
    for (const f of uploads) {
      const stored = await this.storage.save(f, user.id);
      await this.db.insert(fundRequestAttachments).values({ id: randomUUID(), requestId, fileId: stored.id, kind });
    }
  }

  async create(input: CreateFundRequestInput, quotes: UploadedFile[], user: AuthUser) {
    if (input.projectId) {
      const mine = await this.projects.list(user);
      if (!mine.some((p) => p.id === input.projectId)) input.projectId = undefined;
    }
    const id = randomUUID();
    await this.db.transaction(async (tx) => {
      await tx.insert(fundRequests).values({ id, requesterId: user.id, ...input, projectId: input.projectId ?? null });
      await tx.insert(fundRequestEvents).values({ id: randomUUID(), requestId: id, actorId: user.id, action: "submitted" });
    });
    await this.attach(id, "quote", quotes, user);
    await this.activity.record(user.id, `requested funds: “${input.title}”`);
    return this.get(id, user);
  }

  async decide(id: string, input: DecideFundRequestInput, user: AuthUser) {
    const req = await this.get(id, user);
    if (!allowedDecisions(req, asUser(user)).includes(input.decision)) {
      throw new ForbiddenException({ code: "decision_not_allowed", message: "You can't take this action on this request right now." });
    }
    await this.db.transaction(async (tx) => {
      await tx.update(fundRequests).set({ status: input.decision }).where(eq(fundRequests.id, id));
      await tx.insert(fundRequestEvents).values({ id: randomUUID(), requestId: id, actorId: user.id, action: input.decision, note: input.note ?? null });
      if (input.decision === "disbursed") {
        // Paying out books the expense (and project spend) in the same transaction.
        await tx.insert(transactions).values({
          id: randomUUID(),
          kind: "expense",
          amount: req.amount,
          category: req.category,
          date: lagosToday(),
          description: `Fund request: ${req.title}`.slice(0, 255),
          fundRequestId: id,
          recordedBy: user.id,
        });
        if (req.projectId) await this.projects.addSpend(req.projectId, req.amount, tx);
      }
    });
    await this.activity.record(user.id, `${input.decision} the fund request “${req.title}”`);
    return this.get(id, user);
  }

  async addReceipts(id: string, receipts: UploadedFile[], user: AuthUser) {
    const req = await this.get(id, user);
    if (!canAddReceipt(req, asUser(user))) {
      throw new ForbiddenException({ code: "forbidden", message: "Receipts can be added once the request is approved." });
    }
    await this.attach(id, "receipt", receipts, user);
    return this.get(id, user);
  }

  async download(id: string, attachmentId: string, user: AuthUser) {
    await this.get(id, user); // access check
    const [att] = await this.db.select().from(fundRequestAttachments).where(eq(fundRequestAttachments.id, attachmentId)).limit(1);
    if (!att || att.requestId !== id) throw new NotFoundException({ code: "file_not_found", message: "File not found." });
    return this.storage.stream(await this.storage.find(att.fileId));
  }
}

@Controller("fund-requests")
export class FundRequestsController {
  constructor(private readonly service: FundRequestsService) {}

  /** Reviewers (accountant, super admin) see all; everyone else sees their own. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  /** multipart/form-data: fields + up to 5 `quotes` files. */
  @Post()
  @UseInterceptors(upload("quotes"))
  create(
    @Body(new ZodPipe(createFundRequestSchema)) body: CreateFundRequestInput,
    @UploadedFiles() quotes: UploadedFile[] = [],
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(body, quotes ?? [], user);
  }

  @Post(":id/decisions")
  decide(@Param("id") id: string, @Body(new ZodPipe(decideFundRequestSchema)) body: DecideFundRequestInput, @CurrentUser() user: AuthUser) {
    return this.service.decide(id, body, user);
  }

  @Post(":id/receipts")
  @UseInterceptors(upload("receipts"))
  addReceipts(@Param("id") id: string, @UploadedFiles() receipts: UploadedFile[] = [], @CurrentUser() user: AuthUser) {
    return this.service.addReceipts(id, receipts ?? [], user);
  }

  @Get(":id/attachments/:attachmentId")
  download(@Param("id") id: string, @Param("attachmentId") attachmentId: string, @CurrentUser() user: AuthUser) {
    return this.service.download(id, attachmentId, user);
  }
}

@Module({
  imports: [ProjectsModule],
  controllers: [FundRequestsController],
  providers: [FundRequestsService],
})
export class FundRequestsModule {}
