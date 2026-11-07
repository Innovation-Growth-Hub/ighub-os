import { randomUUID } from "node:crypto";
import { Global, Inject, Injectable, Module } from "@nestjs/common";
import { auditLog } from "@ighub/db";
import { DB, type Database } from "../db/db.module.js";

export interface AuditEntry {
  actorId: string | null;
  action: string; // e.g. "account.created"
  targetType?: string;
  targetId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
}

/** Append-only audit trail. Never log passwords or tokens in `meta`. */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async record(entry: AuditEntry) {
    await this.db.insert(auditLog).values({ id: randomUUID(), ...entry });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
