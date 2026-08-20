import { existsSync } from "node:fs";
import type { PrismaClient, Role, User } from "@prisma/client";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import type { AppConfig } from "./config";
import { loadConfig } from "./config";
import { createPrismaClient } from "./db";
import { AuthService, SESSION_COOKIE } from "./auth/authService";
import { StorageService } from "./services/storage/storageService";
import { runSeed } from "../prisma/seed";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerAppRoutes } from "./routes/app.routes";
import { registerProjectRoutes } from "./routes/projects.routes";
import { registerTaskRoutes } from "./routes/tasks.routes";
import { registerPlanEntryRoutes } from "./routes/planEntries.routes";
import { registerAvailabilityRoutes } from "./routes/availability.routes";
import { registerTeamRoutes } from "./routes/team.routes";
import { registerPlannerRoutes } from "./routes/planner.routes";
import { registerConflictRoutes } from "./routes/conflicts.routes";
import { registerVersionRoutes } from "./routes/versions.routes";
import { registerAdminRoutes } from "./routes/admin.routes";
import { registerAuditRoutes } from "./routes/audit.routes";

export interface AppContext {
  config: AppConfig;
  db: PrismaClient;
  auth: AuthService;
  storage: StorageService;
}

export interface BuildAppOptions {
  databaseUrl?: string;
  config?: AppConfig;
  registerStatic?: boolean;
  logger?: boolean | object;
}

function isAllowedOrigin(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return true;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  if (allowed.includes(origin)) return true;
  return host === "vercel.app" || host.endsWith(".vercel.app");
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const db = createPrismaClient(options.databaseUrl ?? config.databaseUrl);
  const auth = new AuthService(db, config.sessionTtlHours);
  const storage = new StorageService(db);
  const context: AppContext = { config, db, auth, storage };

  const app = Fastify({
    logger: options.logger ?? (config.nodeEnv !== "test" ? { level: "info" } : false),
    trustProxy: config.trustProxy,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(cookie, { secret: config.cookieSecret });
  await app.register(cors, {
    origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
      callback(null, isAllowedOrigin(origin, config.corsOrigins));
    },
    credentials: true,
  });
  await app.register(rateLimit, { global: false });

  app.decorateRequest("user", null);

  app.decorateRequest("requireUser", function (this: FastifyRequest): User {
    if (!this.user) {
      throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
    }
    return this.user;
  });

  app.decorateRequest("requireRole", function (this: FastifyRequest, role: Role): User {
    const user = this.requireUser();
    if (user.role !== role) {
      throw Object.assign(new Error("Insufficient permissions."), { statusCode: 403 });
    }
    return user;
  });

  app.decorateRequest("requirePM", function (this: FastifyRequest): User {
    return this.requireRole("PROJECT_MANAGER");
  });

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const token = request.cookies[SESSION_COOKIE];
    request.user = await auth.getUserByToken(token);
  });

  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  await app.register(
    async (apiApp) => {
      registerAuthRoutes(apiApp, context);
      registerAppRoutes(apiApp, context);
      registerProjectRoutes(apiApp, context);
      registerTaskRoutes(apiApp, context);
      registerPlanEntryRoutes(apiApp, context);
      registerAvailabilityRoutes(apiApp, context);
      registerTeamRoutes(apiApp, context);
      registerPlannerRoutes(apiApp, context);
      registerConflictRoutes(apiApp, context);
      registerVersionRoutes(apiApp, context);
      registerAuditRoutes(apiApp, context);
      registerAdminRoutes(apiApp, context);
    },
    { prefix: "/api" },
  );

  const shouldServeStatic = options.registerStatic ?? config.nodeEnv === "production";
  if (shouldServeStatic && config.webDistPath && existsSync(config.webDistPath)) {
    await app.register(fastifyStatic, {
      root: config.webDistPath,
      prefix: "/",
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api")) {
        reply.code(404).send({ error: "Not found" });
        return;
      }
      void reply.sendFile("index.html");
    });
  }

  app.setErrorHandler((error: Error & { statusCode?: number }, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
    }
    reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal server error" : error.message,
      statusCode,
    });
  });

  return app;
}

export async function resetDatabaseToSeed(db: PrismaClient): Promise<void> {
  await runSeed(db);
}