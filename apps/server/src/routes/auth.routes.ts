import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AppContext } from "../app";
import { sessionCookieOptions } from "./sessionCookie";

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: {
          max: ctx.config.authRateLimitMax,
          timeWindow: ctx.config.authRateLimitWindowMs,
        },
      },
    },
    async (request: FastifyRequest<{ Body: { login?: string; password?: string } }>, reply) => {
      const { login, password } = request.body ?? {};
      if (typeof login !== "string" || typeof password !== "string") {
        return reply.code(400).send({ error: "login and password are required" });
      }
      const result = await ctx.auth.login(login, password);
      if (!result) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      reply.setCookie("erp_session", result.token, sessionCookieOptions(request, ctx.config));
      return reply.send({
        user: {
          id: result.user.id,
          login: result.user.login,
          displayName: result.user.displayName,
          role: result.user.role,
          skill: result.user.skill,
        },
      });
    },
  );

  app.post("/auth/logout", async (request, reply) => {
    await ctx.auth.logout(request.cookies.erp_session);
    const opts = sessionCookieOptions(request, ctx.config);
    reply.clearCookie("erp_session", { path: opts.path, secure: opts.secure, sameSite: opts.sameSite });
    return reply.send({ ok: true });
  });

  app.get("/auth/me", async (request: FastifyRequest, reply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: "Not authenticated" });
    }
    return reply.send({
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
        role: user.role,
        skill: user.skill,
      },
    });
  });
}