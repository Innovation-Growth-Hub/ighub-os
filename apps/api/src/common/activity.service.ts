import { randomUUID } from "node:crypto";
import { Controller, Get, Inject, Injectable, Query } from "@nestjs/common";
import { desc } from "drizzle-orm";
import { activities } from "@ighub/db";
import type { Activity } from "@ighub/shared";
import { DB, type Database } from "../db/db.module.js";

/** The dashboard's "recent activity" feed. Short human sentences, e.g. "completed “Fix login”". */
@Injectable()
export class ActivityService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async record(actorId: string, message: string) {
    await this.db.insert(activities).values({ id: randomUUID(), actorId, message: message.slice(0, 255) });
  }

  async recent(limit = 30): Promise<Activity[]> {
    const rows = await this.db.select().from(activities).orderBy(desc(activities.at)).limit(Math.min(limit, 100));
    return rows.map((r) => ({ id: r.id, actorId: r.actorId, message: r.message, at: r.at.toISOString() }));
  }
}

@Controller("activities")
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(@Query("limit") limit?: string) {
    return this.activity.recent(Number(limit) || 30);
  }
}
