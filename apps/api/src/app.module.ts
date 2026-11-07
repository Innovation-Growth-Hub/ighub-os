import { Global, Module, type DynamicModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ENV, loadEnv, type Env } from "./config/env.js";
import { DbModule } from "./db/db.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CommonModule } from "./common/common.module.js";
import { ProblemFilter } from "./common/problem.filter.js";
import { HealthController } from "./health/health.controller.js";
import { AccountsModule } from "./accounts/accounts.module.js";
import { ProjectsModule } from "./projects/projects.controller.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { DailyLogsModule } from "./daily-logs/daily-logs.module.js";
import { FundRequestsModule } from "./fund-requests/fund-requests.module.js";
import { FinanceModule } from "./finance/finance.module.js";
import { MeetingsModule } from "./meetings/meetings.module.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { CrmModule } from "./crm/crm.module.js";

@Global()
@Module({})
class EnvModule {
  static register(env: Env): DynamicModule {
    return { module: EnvModule, providers: [{ provide: ENV, useValue: env }], exports: [ENV] };
  }
}

/** `AppModule.register()` reads the real environment; tests pass their own. */
@Module({})
export class AppModule {
  static register(env: Env = loadEnv()): DynamicModule {
    return {
      module: AppModule,
      imports: [
        EnvModule.register(env),
        DbModule,
        CommonModule,
        AuthModule,
        AccountsModule,
        ProjectsModule,
        TasksModule,
        DailyLogsModule,
        FundRequestsModule,
        FinanceModule,
        MeetingsModule,
        DocumentsModule,
        CrmModule,
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_FILTER, useClass: ProblemFilter }],
    };
  }
}
