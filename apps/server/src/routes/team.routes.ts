import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";

export function registerTeamRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/team", async (request) => {
    const user = request.requireUser();
    const data = await ctx.storage.loadAppData(user.id);
    return data.team;
  });
}