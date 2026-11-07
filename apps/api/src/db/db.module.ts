import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDb, type Database } from "@ighub/db";
import { ENV, type Env } from "../config/env.js";

export const DB = Symbol("DB");
const POOL = Symbol("DB_POOL");

type Pool = ReturnType<typeof createDb>["pool"];

/** One mysql2 pool + Drizzle instance for the process. Inject with `@Inject(DB) db: Database`. */
@Global()
@Module({
  providers: [
    { provide: POOL, inject: [ENV], useFactory: (env: Env) => createDb(env.DATABASE_URL) },
    { provide: DB, inject: [POOL], useFactory: (c: ReturnType<typeof createDb>) => c.db },
  ],
  exports: [DB, POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly conn: { pool: Pool }) {}

  async onApplicationShutdown() {
    await this.conn.pool.end();
  }
}

export type { Database };
