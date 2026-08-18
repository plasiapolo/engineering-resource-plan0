import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";

export function registerConflictRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/conflicts", async (request) => {
    request.requireUser();
    const conflicts = await ctx.db.conflict.findMany({
      where: { deletedAt: null },
      include: { project: true, task: true, employee: true },
      orderBy: { createdAt: "asc" },
    });
    const { toApiConflict } = await import("../services/storage/mappers");
    return conflicts.map(toApiConflict);
  });
}