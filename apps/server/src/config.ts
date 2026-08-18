import path from "node:path";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  databaseUrl: string;
  corsOrigins: string[];
  cookieSecure: boolean;
  cookieSecret: string;
  sessionTtlHours: number;
  authRateLimitMax: number;
  authRateLimitWindowMs: number;
  trustProxy: number;
  webDistPath: string | null;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";
  const webDistPath = path.resolve(__dirname, "../../web/dist");

  return {
    nodeEnv,
    port: Number(env.PORT ?? 4000),
    host: env.HOST ?? "0.0.0.0",
    databaseUrl: env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp?schema=public",
    corsOrigins: parseList(env.CORS_ORIGINS ?? "http://localhost:5173"),
    cookieSecure: parseBool(env.COOKIE_SECURE, isProduction),
    cookieSecret: env.COOKIE_SECRET ?? "insecure-local-secret",
    sessionTtlHours: Number(env.SESSION_TTL_HOURS ?? 12),
    authRateLimitMax: Number(env.AUTH_RATE_LIMIT_MAX ?? 20),
    authRateLimitWindowMs: Number(env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60000),
    trustProxy: Number(env.TRUST_PROXY ?? 1),
    webDistPath,
  };
}

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.NODE_ENV ?? "development") === "production";
}