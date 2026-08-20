import type { FastifyRequest } from "fastify";
import type { AppConfig } from "../config";

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "none";
  path: "/";
  maxAge: number;
}

export function sessionCookieOptions(request: FastifyRequest, config: AppConfig): SessionCookieOptions {
  const origin = request.headers.origin;
  let crossSite = false;
  if (origin) {
    try {
      crossSite = new URL(origin).host !== request.host;
    } catch {
      crossSite = true;
    }
  }
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: crossSite && config.cookieSecure ? "none" : "lax",
    path: "/",
    maxAge: config.sessionTtlHours * 3600,
  };
}