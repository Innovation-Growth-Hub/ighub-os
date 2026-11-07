import { fileURLToPath } from "node:url";

export * as schema from "./schema/index.js";
export * from "./schema/index.js";
export { createDb, type Database } from "./client.js";
export { createSuperAdmin } from "./admin.js";

/** Absolute path to the SQL migrations, for programmatic migrate() in tests and deploys. */
export const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
