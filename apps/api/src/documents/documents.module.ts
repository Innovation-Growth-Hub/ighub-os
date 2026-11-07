import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { desc, eq } from "drizzle-orm";
import { documentShares, documents, files } from "@ighub/db";
import {
  isAdmin,
  shareDocumentSchema,
  uploadDocumentSchema,
  type DocumentCategory,
  type DocumentFile,
} from "@ighub/shared";
import { CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { ActivityService } from "../common/activity.service.js";
import { MAX_UPLOAD_BYTES, sizeKb, StorageService, type UploadedFile } from "../common/storage.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB, type Database } from "../db/db.module.js";

type Doc = DocumentFile & { fileId: string };

/** Owners and people it's shared with can open a document; owners and admins manage it. */
@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: StorageService,
    private readonly activity: ActivityService,
  ) {}

  private async loadAll(): Promise<Doc[]> {
    const [rows, shares] = await Promise.all([
      this.db.select({ d: documents, f: files }).from(documents).innerJoin(files, eq(files.id, documents.fileId)).orderBy(desc(documents.updatedAt)),
      this.db.select().from(documentShares),
    ]);
    return rows.map(({ d, f }) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      sizeKb: sizeKb(f.sizeBytes),
      ownerId: d.ownerId,
      updatedAt: d.updatedAt.toISOString(),
      version: d.version,
      sharedWith: shares.filter((s) => s.documentId === d.id).map((s) => s.userId),
      fileId: d.fileId,
    }));
  }

  private canOpen = (d: Doc, u: AuthUser) => isAdmin(u.role) || d.ownerId === u.id || d.sharedWith.includes(u.id);
  private canManage = (d: Doc, u: AuthUser) => isAdmin(u.role) || d.ownerId === u.id;
  private strip = ({ fileId: _f, ...d }: Doc): DocumentFile => d;

  async list(user: AuthUser) {
    return (await this.loadAll()).filter((d) => this.canOpen(d, user)).map(this.strip);
  }

  private async find(id: string, user: AuthUser) {
    const doc = (await this.loadAll()).find((d) => d.id === id);
    if (!doc || !this.canOpen(doc, user)) throw new NotFoundException({ code: "document_not_found", message: "Document not found." });
    return doc;
  }

  async upload(category: DocumentCategory, uploads: UploadedFile[], user: AuthUser) {
    if (!uploads.length) throw new BadRequestException({ code: "no_files", message: "Choose at least one file." });
    for (const f of uploads) {
      const stored = await this.storage.save(f, user.id);
      await this.db.insert(documents).values({ id: randomUUID(), name: stored.originalName, category, fileId: stored.id, ownerId: user.id });
    }
    await this.activity.record(user.id, uploads.length === 1 ? `uploaded ${uploads[0]!.originalname}` : `uploaded ${uploads.length} documents`);
    return this.list(user);
  }

  async share(id: string, userIds: string[], user: AuthUser) {
    const doc = await this.find(id, user);
    if (!this.canManage(doc, user)) throw new ForbiddenException({ code: "forbidden", message: "Only the owner or an admin can share this." });
    const people = [...new Set(userIds)].filter((u) => u !== doc.ownerId);
    await this.db.transaction(async (tx) => {
      await tx.delete(documentShares).where(eq(documentShares.documentId, id));
      if (people.length) await tx.insert(documentShares).values(people.map((userId) => ({ documentId: id, userId })));
    });
    return this.strip(await this.find(id, user));
  }

  async remove(id: string, user: AuthUser) {
    const doc = await this.find(id, user);
    if (!this.canManage(doc, user)) throw new ForbiddenException({ code: "forbidden", message: "Only the owner or an admin can delete this." });
    const file = await this.storage.find(doc.fileId);
    await this.db.delete(documents).where(eq(documents.id, id));
    await this.storage.remove(file);
  }

  async download(id: string, user: AuthUser) {
    const doc = await this.find(id, user);
    return this.storage.stream(await this.storage.find(doc.fileId));
  }
}

@Controller("documents")
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.docs.list(user);
  }

  /** multipart/form-data: `category` + up to 5 `files`. */
  @Post()
  @UseInterceptors(FilesInterceptor("files", 5, { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @Body(new ZodPipe(uploadDocumentSchema)) body: { category: DocumentCategory },
    @UploadedFiles() uploads: UploadedFile[] = [],
    @CurrentUser() user: AuthUser,
  ) {
    return this.docs.upload(body.category, uploads ?? [], user);
  }

  @Put(":id/shares")
  share(@Param("id") id: string, @Body(new ZodPipe(shareDocumentSchema)) body: { userIds: string[] }, @CurrentUser() user: AuthUser) {
    return this.docs.share(id, body.userIds, user);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.docs.remove(id, user);
  }

  @Get(":id/download")
  download(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.docs.download(id, user);
  }
}

@Module({ controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
