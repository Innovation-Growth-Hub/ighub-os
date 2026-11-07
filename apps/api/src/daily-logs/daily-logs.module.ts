import { randomUUID } from "node:crypto";
import { Body, Controller, ForbiddenException, Get, Inject, Injectable, Module, Put, Query } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { dailyLogs } from "@ighub/db";
import { canViewAllDailyLogs, saveDailyLogSchema, writesDailyLog, type DailyLog, type SaveDailyLogInput } from "@ighub/shared";
import { CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { ActivityService } from "../common/activity.service.js";
import { lagosToday } from "../common/clock.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB, type Database } from "../db/db.module.js";

type Row = typeof dailyLogs.$inferSelect;
const toLog = (r: Row): DailyLog => ({
  id: r.id,
  userId: r.userId,
  date: r.date,
  entries: r.entries,
  blockers: r.blockers ?? undefined,
  updatedAt: r.updatedAt.toISOString(),
});

/** One log per person per Lagos day, editable that day only. The super admin reads everyone's (view only). */
@Injectable()
export class DailyLogsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly activity: ActivityService,
  ) {}

  async list(user: AuthUser, filter: { date?: string; userId?: string }) {
    const conditions = [];
    if (canViewAllDailyLogs(user.role)) {
      if (filter.date) conditions.push(eq(dailyLogs.date, filter.date));
      if (filter.userId) conditions.push(eq(dailyLogs.userId, filter.userId));
    } else {
      conditions.push(eq(dailyLogs.userId, user.id));
    }
    const rows = await this.db.select().from(dailyLogs).where(and(...conditions)).orderBy(desc(dailyLogs.date)).limit(500);
    return rows.map(toLog);
  }

  async saveToday(user: AuthUser, input: SaveDailyLogInput) {
    if (!writesDailyLog(user.role)) throw new ForbiddenException({ code: "forbidden", message: "Your role doesn't write daily logs." });
    const date = lagosToday();
    const entries = input.entries.map((e) => ({ ...e, id: e.id || randomUUID() }));
    const [existing] = await this.db.select().from(dailyLogs).where(and(eq(dailyLogs.userId, user.id), eq(dailyLogs.date, date))).limit(1);
    if (existing) {
      await this.db.update(dailyLogs).set({ entries, blockers: input.blockers ?? null }).where(eq(dailyLogs.id, existing.id));
    } else {
      await this.db.insert(dailyLogs).values({ id: randomUUID(), userId: user.id, date, entries, blockers: input.blockers ?? null });
      await this.activity.record(user.id, `logged ${entries.length} task${entries.length === 1 ? "" : "s"} for today`);
    }
    const [row] = await this.db.select().from(dailyLogs).where(and(eq(dailyLogs.userId, user.id), eq(dailyLogs.date, date))).limit(1);
    return toLog(row!);
  }
}

@Controller("daily-logs")
export class DailyLogsController {
  constructor(private readonly logs: DailyLogsService) {}

  /** Own logs; the super admin can filter everyone's by ?date= or ?userId=. */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("date") date?: string, @Query("userId") userId?: string) {
    return this.logs.list(user, { date, userId });
  }

  /** Lagos "today" for the server; the client never chooses the date. */
  @Get("today")
  today() {
    return { date: lagosToday() };
  }

  @Put("today")
  save(@Body(new ZodPipe(saveDailyLogSchema)) body: SaveDailyLogInput, @CurrentUser() user: AuthUser) {
    return this.logs.saveToday(user, body);
  }
}

@Module({ controllers: [DailyLogsController], providers: [DailyLogsService] })
export class DailyLogsModule {}
