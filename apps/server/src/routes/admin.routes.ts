import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";
import { resetDatabaseToSeed } from "../app";

export function registerAdminRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/admin/reset", async (request, reply) => {
    const pm = request.requirePM();
    const login = pm.login;
    await ctx.storage.audit(pm.id, "SYSTEM", null, "RESET_TO_SEED");
    await resetDatabaseToSeed(ctx.db);
    const freshPm = await ctx.db.user.findUniqueOrThrow({ where: { login } });
    const token = await ctx.auth.createSessionForUser(freshPm.id);
    reply.setCookie("erp_session", token, {
      httpOnly: true,
      secure: ctx.config.cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: ctx.config.sessionTtlHours * 3600,
    });
    return reply.send({ ok: true });
  });

  app.post("/admin/wipe", async (request, reply) => {
    const pm = request.requirePM();
    await ctx.storage.audit(pm.id, "SYSTEM", null, "WIPE_PROJECTS");
    await ctx.storage.wipeAllProjects(pm.id);
    return reply.send({ ok: true });
  });
}