import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { files } from "@ighub/db";
import { ENV, type Env } from "../config/env.js";
import { DB, type Database } from "../db/db.module.js";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB per file

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type StoredFile = typeof files.$inferSelect;

/**
 * Local-disk file storage under UPLOAD_DIR (outside any public folder on
 * Hostinger). Files are only ever served through authorised API routes.
 * Swap for S3/R2 later behind the same methods.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) env: Env,
  ) {
    this.root = path.resolve(env.UPLOAD_DIR);
  }

  async save(file: UploadedFile, uploadedBy: string): Promise<StoredFile> {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException({ code: "file_type_not_allowed", message: `“${file.originalname}” isn't an allowed file type.` });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({ code: "file_too_large", message: `“${file.originalname}” is over 10 MB.` });
    }
    const id = randomUUID();
    const now = new Date();
    const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const storageKey = `${dir}/${id}`;
    await mkdir(path.join(this.root, dir), { recursive: true });
    await writeFile(path.join(this.root, storageKey), file.buffer);
    const row: StoredFile = {
      id,
      storageKey,
      originalName: file.originalname.slice(0, 255),
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy,
      createdAt: now,
    };
    await this.db.insert(files).values(row);
    return row;
  }

  async find(id: string) {
    const [row] = await this.db.select().from(files).where(eq(files.id, id)).limit(1);
    if (!row) throw new NotFoundException({ code: "file_not_found", message: "File not found." });
    return row;
  }

  /** Streams a file as a download. Callers must check access first. */
  stream(row: StoredFile) {
    const full = path.join(this.root, row.storageKey);
    return new StreamableFile(createReadStream(full), {
      type: row.mimeType,
      length: row.sizeBytes,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
    });
  }

  async remove(row: StoredFile) {
    await rm(path.join(this.root, row.storageKey), { force: true });
    await this.db.delete(files).where(eq(files.id, row.id));
  }
}

export const sizeKb = (bytes: number) => Math.max(1, Math.round(bytes / 1024));
