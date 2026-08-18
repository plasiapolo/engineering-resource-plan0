import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app";
import type { SnapshotContent } from "../services/versioning/snapshot";
import { toDateString } from "../services/storage/mappers";

export function registerVersionRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/versions", async (request) => {
    request.requireUser();
    const versions = await ctx.storage.listVersions();
    return versions.map((v) => {
      const content = v.planEntriesJson as unknown as SnapshotContent;
      return {
        id: v.id,
        snapshotDate: toDateString(v.snapshotDate),
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        planEntriesCount: content.planEntries?.length ?? 0,
        conflictsCount: content.conflicts?.length ?? 0,
      };
    });
  });

  app.get("/versions/:id", async (request, reply) => {
    request.requireUser();
    const { id } = request.params as { id: string };
    const version = await ctx.storage.getVersion(id);
    const content = version.planEntriesJson as unknown as SnapshotContent;
    return reply.send({
      id: version.id,
      snapshotDate: toDateString(version.snapshotDate),
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
      planEntries: content.planEntries ?? [],
      conflicts: content.conflicts ?? [],
    });
  });
}