import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Public } from "../auth/decorators.js";
import { DB, type Database } from "../db/db.module.js";

/** Liveness + database check for Hostinger and CI smoke tests. */
@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  @Public()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
      return { status: "ok", database: "up" };
    } catch {
      throw new ServiceUnavailableException({ code: "database_down", message: "Database is unreachable." });
    }
  }
}
