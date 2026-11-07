import { Global, Module, type DynamicModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ENV, loadEnv, type Env } from "./config/env.js";
import { DbModule } from "./db/db.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AuditModule } from "./common/audit.service.js";
import { ProblemFilter } from "./common/problem.filter.js";
import { HealthController } from "./health/health.controller.js";
import { AccountsModule } from "./accounts/accounts.module.js";

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
      imports: [EnvModule.register(env), DbModule, AuditModule, AuthModule, AccountsModule],
      controllers: [HealthController],
      providers: [{ provide: APP_FILTER, useClass: ProblemFilter }],
    };
  }
}
