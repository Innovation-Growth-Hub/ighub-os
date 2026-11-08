import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Public } from "../auth/decorators.js";
import { DB, type Database } from "../db/db.module.js";
import { describeDbError, startupState } from "../startup.js";

/** Liveness + database check for Hostinger and CI smoke tests. */
@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  @Public()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
    } catch (e) {
      throw new ServiceUnavailableException({ code: "database_down", message: `Database is unreachable (${describeDbError(e)}).` });
    }
    if (startupState.pending) {
      throw new ServiceUnavailableException({ code: "starting", message: "Setting up the database. Try again in a few seconds." });
    }
    if (!startupState.ok) {
      throw new ServiceUnavailableException({ code: "startup_failed", message: `Database setup failed at startup: ${startupState.error}` });
    }
    return { status: "ok", database: "up" };
  }
}
