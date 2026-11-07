import { ConsoleLogger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { AUTH, type Auth } from "./auth/auth.js";
import type { Env } from "./config/env.js";

/**
 * Builds the app. Shared by main.ts and the e2e tests so both run the exact
 * same middleware order:
 *   helmet → /api/auth/* (Better Auth, raw body) → JSON parser → Nest /api/v1/*
 */
export async function createApp(env?: Env) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(env), {
    // Better Auth must read the raw request body, so Nest's parser is added after it.
    bodyParser: false,
    logger: new ConsoleLogger({ json: env?.NODE_ENV === "production" || process.env.NODE_ENV === "production" }),
  });

  const server = app.getHttpAdapter().getInstance();
  server.disable("x-powered-by");
  // Hostinger (and Next's rewrite) put a proxy in front: trust it for req.ip and secure cookies.
  server.set("trust proxy", 1);

  app.use(helmet());
  server.all("/api/auth/{*any}", toNodeHandler(app.get<Auth>(AUTH)));
  app.use(express.json({ limit: "1mb" }));

  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();
  return app;
}
