import "reflect-metadata";
import { createServer } from "node:http";
import { Logger } from "@nestjs/common";
import { createApp } from "./bootstrap.js";
import { loadEnv, type Env } from "./config/env.js";
import { prepareDatabase } from "./startup.js";

const log = new Logger("Bootstrap");

let env: Env;
try {
  env = loadEnv();
} catch (e) {
  // Misconfigured on the host: instead of crashing (an opaque 503), serve a page that
  // says which variables are wrong. The message lists names and rules, never values.
  const detail = e instanceof Error ? e.message : String(e);
  log.error(detail);
  const port = Number(process.env.PORT) || 4000;
  createServer((_req, res) => {
    res.writeHead(503, { "Content-Type": "application/problem+json" });
    res.end(JSON.stringify({ title: "service unavailable", status: 503, code: "invalid_environment", detail }));
  }).listen(port);
  log.error(`Serving the configuration error on port ${port} until the environment is fixed.`);
  await new Promise(() => undefined); // keep the process alive
  throw e;
}

// Listen first (hosts kill apps that are slow to bind the port), then prepare the
// database in the background. /health reports "starting" until it finishes.
const app = await createApp(env);
await app.listen(env.PORT);
log.log(`API listening on http://localhost:${env.PORT}/api/v1 (auth at /api/auth)`);
void prepareDatabase(env);
