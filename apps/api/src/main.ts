import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { createApp } from "./bootstrap.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = await createApp(env);
await app.listen(env.PORT);
new Logger("Bootstrap").log(`API listening on http://localhost:${env.PORT}/api/v1 (auth at /api/auth)`);
