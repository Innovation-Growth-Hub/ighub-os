import { randomUUID } from "node:crypto";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { milestones, projectMembers, projects } from "@ighub/db";
import { isAdmin, visibleProjects, type CreateMilestoneInput, type CreateProjectInput, type Project, type User } from "@ighub/shared";
import type { AuthUser } from "../auth/types.js";
import { ActivityService } from "../common/activity.service.js";
import { DB, type Database } from "../db/db.module.js";

/** Shared-rule functions only need id + role. */
export const asUser = (u: AuthUser) => ({ id: u.id, role: u.role }) as User;

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly activity: ActivityService,
  ) {}

  /** Every project with team and milestones. Hub-sized data, so one pass is fine. */
  async loadAll(): Promise<Project[]> {
    const [rows, members, ms] = await Promise.all([
      this.db.select().from(projects).orderBy(asc(projects.name)),
      this.db.select().from(projectMembers),
      this.db.select().from(milestones).orderBy(asc(milestones.dueDate)),
    ]);
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      clientName: p.clientName ?? undefined,
      managerId: p.managerId,
      teamIds: members.filter((m) => m.projectId === p.id).map((m) => m.userId),
      startDate: p.startDate,
      endDate: p.endDate,
      budget: Number(p.budget),
      spent: Number(p.spent),
      status: p.status,
      milestones: ms.filter((m) => m.projectId === p.id).map((m) => ({ id: m.id, title: m.title, dueDate: m.dueDate, done: m.done })),
    }));
  }

  async list(user: AuthUser) {
    return visibleProjects(await this.loadAll(), asUser(user));
  }

  async get(id: string, user: AuthUser) {
    const found = (await this.list(user)).find((p) => p.id === id);
    if (!found) throw new NotFoundException({ code: "project_not_found", message: "Project not found." });
    return found;
  }

  async create(input: CreateProjectInput, user: AuthUser) {
    // A PM always manages the projects they create; admins can pick any manager.
    const managerId = isAdmin(user.role) ? input.managerId : user.id;
    const id = randomUUID();
    await this.db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id,
        name: input.name,
        description: input.description,
        clientName: input.clientName ?? null,
        managerId,
        startDate: input.startDate,
        endDate: input.endDate,
        budget: input.budget,
        status: input.status,
      });
      const team = [...new Set(input.teamIds)].filter((t) => t !== managerId);
      if (team.length) await tx.insert(projectMembers).values(team.map((userId) => ({ projectId: id, userId })));
    });
    await this.activity.record(user.id, `created the project “${input.name}”`);
    return this.get(id, user);
  }

  private async editable(id: string, user: AuthUser) {
    const project = await this.get(id, user);
    if (!isAdmin(user.role) && project.managerId !== user.id) {
      throw new ForbiddenException({ code: "forbidden", message: "Only the project manager or an admin can change this project." });
    }
    return project;
  }

  async addMilestone(projectId: string, input: CreateMilestoneInput, user: AuthUser) {
    await this.editable(projectId, user);
    await this.db.insert(milestones).values({ id: randomUUID(), projectId, title: input.title, dueDate: input.dueDate });
    return this.get(projectId, user);
  }

  async toggleMilestone(projectId: string, milestoneId: string, user: AuthUser) {
    const project = await this.editable(projectId, user);
    const m = project.milestones.find((x) => x.id === milestoneId);
    if (!m) throw new NotFoundException({ code: "milestone_not_found", message: "Milestone not found." });
    await this.db.update(milestones).set({ done: !m.done }).where(and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)));
    if (!m.done) await this.activity.record(user.id, `marked “${m.title}” done on ${project.name}`);
    return this.get(projectId, user);
  }

  /** Paid-out fund requests linked to a project count towards its spend. */
  async addSpend(projectId: string, amount: number, tx: Pick<Database, "update"> = this.db) {
    await tx.update(projects).set({ spent: sql`${projects.spent} + ${amount}` }).where(eq(projects.id, projectId));
  }
}
