import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ENV, type Env } from "../config/env.js";
import { DB, type Database } from "../db/db.module.js";
import { AUTH, createAuth } from "./auth.js";
import { AuthGuard } from "./auth.guard.js";

/** Provides the Better Auth instance (mounted in bootstrap.ts) and the global AuthGuard. */
@Global()
@Module({
  providers: [
    { provide: AUTH, inject: [DB, ENV], useFactory: (db: Database, env: Env) => createAuth(db, env) },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AUTH],
})
export class AuthModule {}
