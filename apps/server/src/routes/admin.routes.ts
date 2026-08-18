import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";
import { resetDatabaseToSeed } from "../app";

export function registerAdminRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/admin/reset", async (request, reply) => {
    const pm = request.requirePM();
    await ctx.storage.audit(pm.id, "SYSTEM", null, "RESET_TO_SEED");
    await resetDatabaseToSeed(ctx.db);
    return reply.send({ ok: true });
  });

  app.post("/admin/wipe", async (request, reply) => {
    const pm = request.requirePM();
    await ctx.storage.audit(pm.id, "SYSTEM", null, "WIPE_PROJECTS");
    await ctx.storage.wipeAllProjects(pm.id);
    return reply.send({ ok: true });
  });
}