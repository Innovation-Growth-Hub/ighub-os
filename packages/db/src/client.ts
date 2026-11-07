import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index.js";

export type Database = ReturnType<typeof createDb>["db"];

/**
 * One pool per process. Datetimes are read and written as UTC ("Z"); business
 * rules convert to Africa/Lagos in one place in the API.
 */
export function createDb(url: string, opts: { connectionLimit?: number } = {}) {
  const pool = mysql.createPool({
    uri: url,
    timezone: "Z",
    connectionLimit: opts.connectionLimit ?? 10,
    charset: "utf8mb4_0900_ai_ci",
  });
  const db = drizzle(pool, { schema, mode: "default" });
  return { db, pool };
}
