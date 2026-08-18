import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";

export function registerPlannerRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/planner/generate", async (request, reply) => {
    const pm = request.requirePM();
    const summary = await ctx.storage.generatePlan(pm.id);
    return reply.send(summary);
  });
}