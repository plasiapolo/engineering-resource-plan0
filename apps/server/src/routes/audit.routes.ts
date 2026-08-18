import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";

export function registerAuditRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/audit", async (request) => {
    request.requirePM();
    const logs = await ctx.storage.listAudit();
    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userLogin: log.user.login,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      timestamp: log.timestamp.toISOString(),
    }));
  });
}