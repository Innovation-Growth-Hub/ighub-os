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
  Patch,
  Post,
} from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { tasks } from "@ighub/db";
import {
  assignableUsers,
  canManageTask,
  canManageTasks,
  createTaskSchema,
  isAdmin,
  managedProjects,
  moveTaskSchema,
  type CreateTaskInput,
  type MoveTaskInput,
  type Task,
} from "@ighub/shared";
import { AllowRoles, CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { AccountsModule } from "../accounts/accounts.module.js";
import { AccountsRepository } from "../accounts/accounts.repository.js";
import { ActivityService } from "../common/activity.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB, type Database } from "../db/db.module.js";
import { ProjectsModule } from "../projects/projects.controller.js";
import { asUser, ProjectsService } from "../projects/projects.service.js";

type Row = typeof tasks.$inferSelect;
const toTask = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  description: r.description ?? undefined,
  assignedTo: r.assignedTo,
  createdBy: r.createdBy,
  dueDate: r.dueDate,
  priority: r.priority,
  status: r.status,
  projectId: r.projectId ?? undefined,
  tags: r.tags ?? [],
});

/**
 * Task rules (AUTH-ARCHITECTURE §4.3):
 *  - staff see and move only tasks assigned to them
 *  - PMs create/assign/delete only on projects they manage, to people on those projects
 *  - admins do everything
 */
@Injectable()
export class TasksService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly projects: ProjectsService,
    private readonly accounts: AccountsRepository,
    private readonly activity: ActivityService,
  ) {}

  async list(user: AuthUser) {
    const [rows, projects] = await Promise.all([this.db.select().from(tasks).orderBy(desc(tasks.createdAt)), this.projects.loadAll()]);
    const all = rows.map(toTask);
    if (isAdmin(user.role)) return all;
    return all.filter((t) => t.assignedTo === user.id || canManageTask(t, projects, asUser(user)));
  }

  private async find(id: string) {
    const [row] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!row) throw new NotFoundException({ code: "task_not_found", message: "Task not found." });
    return toTask(row);
  }

  async create(input: CreateTaskInput, user: AuthUser) {
    const [users, projects] = await Promise.all([this.accounts.list(), this.projects.loadAll()]);
    const me = asUser(user);
    if (!assignableUsers(users, projects, me).some((u) => u.id === input.assignedTo)) {
      throw new ForbiddenException({ code: "assignee_not_allowed", message: "You can only assign tasks to people on your projects." });
    }
    if (input.projectId) {
      const allowed = isAdmin(user.role) ? projects : managedProjects(projects, me);
      if (!allowed.some((p) => p.id === input.projectId)) {
        throw new BadRequestException({ code: "project_not_allowed", message: "Pick one of your projects." });
      }
    }
    const id = randomUUID();
    await this.db.insert(tasks).values({ id, ...input, description: input.description ?? null, projectId: input.projectId ?? null, createdBy: user.id, status: "pending" });
    const assignee = users.find((u) => u.id === input.assignedTo);
    await this.activity.record(user.id, `assigned “${input.title}” to ${assignee?.name ?? "someone"}`);
    return this.find(id);
  }

  async move(id: string, input: MoveTaskInput, user: AuthUser) {
    const task = await this.find(id);
    const projects = await this.projects.loadAll();
    if (task.assignedTo !== user.id && !canManageTask(task, projects, asUser(user))) {
      throw new ForbiddenException({ code: "forbidden", message: "You can only update your own tasks." });
    }
    await this.db.update(tasks).set({ status: input.status }).where(eq(tasks.id, id));
    if (input.status === "complete" && task.status !== "complete") await this.activity.record(user.id, `completed “${task.title}”`);
    return { ...task, status: input.status };
  }

  async remove(id: string, user: AuthUser) {
    const task = await this.find(id);
    if (!canManageTask(task, await this.projects.loadAll(), asUser(user))) {
      throw new ForbiddenException({ code: "forbidden", message: "You can't delete this task." });
    }
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }
}

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.tasks.list(user);
  }

  @Post()
  @AllowRoles(canManageTasks)
  create(@Body(new ZodPipe(createTaskSchema)) body: CreateTaskInput, @CurrentUser() user: AuthUser) {
    return this.tasks.create(body, user);
  }

  @Patch(":id/status")
  move(@Param("id") id: string, @Body(new ZodPipe(moveTaskSchema)) body: MoveTaskInput, @CurrentUser() user: AuthUser) {
    return this.tasks.move(id, body, user);
  }

  @Delete(":id")
  @HttpCode(204)
  @AllowRoles(canManageTasks)
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.remove(id, user);
  }
}

@Module({
  imports: [ProjectsModule, AccountsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
