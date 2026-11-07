import { randomUUID } from "node:crypto";
import { Body, Controller, ForbiddenException, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { meetingParticipants, meetings } from "@ighub/db";
import {
  canScheduleMeetings,
  createMeetingSchema,
  isAdmin,
  meetingStatusSchema,
  type CreateMeetingInput,
  type Meeting,
  type MeetingStatus,
} from "@ighub/shared";
import { AllowRoles, CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { ActivityService } from "../common/activity.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB, type Database } from "../db/db.module.js";

/** Admins and PMs schedule; everyone else sees meetings they're invited to. The organiser is participantIds[0]. */
@Injectable()
export class MeetingsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly activity: ActivityService,
  ) {}

  private async loadAll(): Promise<Meeting[]> {
    const [rows, people] = await Promise.all([
      this.db.select().from(meetings).orderBy(asc(meetings.start)),
      this.db.select().from(meetingParticipants).orderBy(asc(meetingParticipants.position)),
    ]);
    return rows.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      start: m.start.toISOString(),
      end: m.end.toISOString(),
      location: m.location,
      agenda: m.agenda ?? [],
      status: m.status,
      participantIds: [m.organizerId, ...people.filter((p) => p.meetingId === m.id && p.userId !== m.organizerId).map((p) => p.userId)],
    }));
  }

  async list(user: AuthUser) {
    const all = await this.loadAll();
    return isAdmin(user.role) ? all : all.filter((m) => m.participantIds.includes(user.id));
  }

  async create(input: CreateMeetingInput, user: AuthUser) {
    const id = randomUUID();
    const people = [user.id, ...new Set(input.participantIds.filter((p) => p !== user.id))];
    await this.db.transaction(async (tx) => {
      await tx.insert(meetings).values({
        id,
        title: input.title,
        description: input.description,
        start: new Date(input.start),
        end: new Date(input.end),
        location: input.location,
        agenda: input.agenda,
        organizerId: user.id,
      });
      await tx.insert(meetingParticipants).values(people.map((userId, position) => ({ meetingId: id, userId, position })));
    });
    await this.activity.record(user.id, `scheduled “${input.title}”`);
    return (await this.loadAll()).find((m) => m.id === id);
  }

  async setStatus(id: string, status: MeetingStatus, user: AuthUser) {
    const meeting = (await this.loadAll()).find((m) => m.id === id);
    if (!meeting) throw new NotFoundException({ code: "meeting_not_found", message: "Meeting not found." });
    if (!isAdmin(user.role) && meeting.participantIds[0] !== user.id) {
      throw new ForbiddenException({ code: "forbidden", message: "Only the organiser or an admin can change this meeting." });
    }
    await this.db.update(meetings).set({ status }).where(eq(meetings.id, id));
    return { ...meeting, status };
  }
}

@Controller("meetings")
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.meetings.list(user);
  }

  @Post()
  @AllowRoles(canScheduleMeetings)
  create(@Body(new ZodPipe(createMeetingSchema)) body: CreateMeetingInput, @CurrentUser() user: AuthUser) {
    return this.meetings.create(body, user);
  }

  @Patch(":id/status")
  status(@Param("id") id: string, @Body(new ZodPipe(meetingStatusSchema)) body: { status: MeetingStatus }, @CurrentUser() user: AuthUser) {
    return this.meetings.setStatus(id, body.status, user);
  }
}

@Module({ controllers: [MeetingsController], providers: [MeetingsService] })
export class MeetingsModule {}
