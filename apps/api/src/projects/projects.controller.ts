import { Body, Controller, Get, Module, Param, Patch, Post } from "@nestjs/common";
import { canManageTasks, createMilestoneSchema, createProjectSchema, type CreateMilestoneInput, type CreateProjectInput } from "@ighub/shared";
import { AllowRoles, CurrentUser } from "../auth/decorators.js";
import type { AuthUser } from "../auth/types.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { ProjectsService } from "./projects.service.js";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /** Admins see all; everyone else sees projects they manage or are on. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.projects.list(user);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.projects.get(id, user);
  }

  /** Admins and project managers. */
  @Post()
  @AllowRoles(canManageTasks)
  create(@Body(new ZodPipe(createProjectSchema)) body: CreateProjectInput, @CurrentUser() user: AuthUser) {
    return this.projects.create(body, user);
  }

  @Post(":id/milestones")
  addMilestone(@Param("id") id: string, @Body(new ZodPipe(createMilestoneSchema)) body: CreateMilestoneInput, @CurrentUser() user: AuthUser) {
    return this.projects.addMilestone(id, body, user);
  }

  @Patch(":id/milestones/:milestoneId/toggle")
  toggle(@Param("id") id: string, @Param("milestoneId") milestoneId: string, @CurrentUser() user: AuthUser) {
    return this.projects.toggleMilestone(id, milestoneId, user);
  }
}

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
