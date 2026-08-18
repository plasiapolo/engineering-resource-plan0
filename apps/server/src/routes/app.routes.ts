import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";

export function registerAppRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/app-data", async (request, reply) => {
    const user = request.requireUser();
    const data = await ctx.storage.loadAppData(user.id);
    return reply.send(data);
  });
}